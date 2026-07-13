/**
 * mlsClient.js
 * ------------
 * Thin wrapper around a RESO Web API (OData) compliant MLS feed.
 * RESO Web API is the industry-standard interface used by most MLS
 * aggregators (Spark API, Trestle/CoreLogic, Bridge Interactive, etc).
 *
 * If your MLS provider does NOT speak RESO Web API, this is the only
 * file you need to rewrite — everything downstream (tools, routes,
 * Claude agent) talks to the functions exported here, not to the raw API.
 *
 * Required env vars:
 *   MLS_BASE_URL   e.g. https://api.mlsgrid.com/v2  or your provider's base
 *   MLS_TOKEN      Bearer token / API key issued by your MLS provider
 */

import fetch from "node-fetch";

const BASE_URL = process.env.MLS_BASE_URL;
const TOKEN = process.env.MLS_TOKEN;

function authHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
  };
}

/**
 * Build an OData $filter string from a simple params object.
 * Keeps callers (the Claude tool handlers) from needing to know OData syntax.
 */
function buildFilter(params) {
  const clauses = [];

  if (params.city) clauses.push(`City eq '${escapeOData(params.city)}'`);
  if (params.state) clauses.push(`StateOrProvince eq '${escapeOData(params.state)}'`);
  if (params.zip) clauses.push(`PostalCode eq '${escapeOData(params.zip)}'`);
  if (params.minPrice) clauses.push(`ListPrice ge ${Number(params.minPrice)}`);
  if (params.maxPrice) clauses.push(`ListPrice le ${Number(params.maxPrice)}`);
  if (params.minBeds) clauses.push(`BedroomsTotal ge ${Number(params.minBeds)}`);
  if (params.minBaths) clauses.push(`BathroomsTotalInteger ge ${Number(params.minBaths)}`);
  if (params.propertyType) clauses.push(`PropertyType eq '${escapeOData(params.propertyType)}'`);
  if (params.status) clauses.push(`StandardStatus eq '${escapeOData(params.status)}'`);
  else clauses.push(`StandardStatus eq 'Active'`); // default to active listings only

  return clauses.join(" and ");
}

function escapeOData(value) {
  return String(value).replace(/'/g, "''");
}

/**
 * Search listings matching criteria. Returns a trimmed list of fields
 * useful for chat responses (not the full raw MLS record).
 */
export async function searchListings(params = {}) {
  const filter = buildFilter(params);
  const top = Math.min(params.limit || 10, 25);

  const select = [
    "ListingKey",
    "ListPrice",
    "UnparsedAddress",
    "City",
    "StateOrProvince",
    "PostalCode",
    "BedroomsTotal",
    "BathroomsTotalInteger",
    "LivingArea",
    "PropertyType",
    "StandardStatus",
    "PublicRemarks",
    "PhotosCount",
    "ListAgentFullName",
  ].join(",");

  const url = `${BASE_URL}/Property?$filter=${encodeURIComponent(filter)}&$select=${select}&$top=${top}`;

  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`MLS search failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return (data.value || []).map(simplifyListing);
}

/**
 * Fetch full detail for a single listing by its ListingKey.
 */
export async function getListingDetail(listingKey) {
  const url = `${BASE_URL}/Property('${encodeURIComponent(listingKey)}')`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`MLS detail fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return simplifyListing(data, { detailed: true });
}

/**
 * Pull recently sold "comparable" properties near a given listing —
 * same city/zip, similar bed/bath count, sold in the last N months.
 */
export async function getComparables(listingKey, monthsBack = 6) {
  const subject = await getListingDetail(listingKey);

  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - monthsBack);
  const sinceStr = sinceDate.toISOString().split("T")[0];

  const filter = [
    `StandardStatus eq 'Closed'`,
    `PostalCode eq '${escapeOData(subject.zip)}'`,
    `BedroomsTotal ge ${Math.max((subject.beds || 1) - 1, 0)}`,
    `BedroomsTotal le ${(subject.beds || 1) + 1}`,
    `CloseDate ge ${sinceStr}`,
  ].join(" and ");

  const select = [
    "ListingKey",
    "ClosePrice",
    "CloseDate",
    "UnparsedAddress",
    "BedroomsTotal",
    "BathroomsTotalInteger",
    "LivingArea",
  ].join(",");

  const url = `${BASE_URL}/Property?$filter=${encodeURIComponent(filter)}&$select=${select}&$top=10`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`MLS comps fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return {
    subject,
    comparables: (data.value || []).map((c) => ({
      address: c.UnparsedAddress,
      closePrice: c.ClosePrice,
      closeDate: c.CloseDate,
      beds: c.BedroomsTotal,
      baths: c.BathroomsTotalInteger,
      sqft: c.LivingArea,
    })),
  };
}

function simplifyListing(raw, { detailed = false } = {}) {
  const base = {
    listingKey: raw.ListingKey,
    price: raw.ListPrice,
    address: raw.UnparsedAddress,
    city: raw.City,
    state: raw.StateOrProvince,
    zip: raw.PostalCode,
    beds: raw.BedroomsTotal,
    baths: raw.BathroomsTotalInteger,
    sqft: raw.LivingArea,
    propertyType: raw.PropertyType,
    status: raw.StandardStatus,
    photosCount: raw.PhotosCount,
    listingAgent: raw.ListAgentFullName,
  };
  if (detailed) {
    base.description = raw.PublicRemarks;
  } else {
    base.summary = raw.PublicRemarks ? raw.PublicRemarks.slice(0, 200) : undefined;
  }
  return base;
}
