/**
 * tools.js
 * --------
 * Defines the tools Claude can call to look up MLS data, and the
 * handlers that actually execute them against mlsClient.js.
 *
 * Buyer and realtor routes both use this same tool set — the
 * difference between roles is enforced in the SYSTEM PROMPT
 * (see realtorRoute.js / buyerRoute.js), not the tools themselves.
 * If you later want realtor-only tools (e.g. pulling seller net-sheet
 * data, private remarks, or commission info), add them to
 * REALTOR_ONLY_TOOLS below and merge conditionally per route.
 */

import { searchListings, getListingDetail, getComparables } from "./mlsClient.js";

export const BASE_TOOLS = [
  {
    name: "search_listings",
    description:
      "Search active MLS listings by city, zip, price range, beds, baths, or property type. Use this whenever the user describes what kind of home they want.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string" },
        state: { type: "string", description: "Two-letter state code, e.g. SC" },
        zip: { type: "string" },
        minPrice: { type: "number" },
        maxPrice: { type: "number" },
        minBeds: { type: "number" },
        minBaths: { type: "number" },
        propertyType: {
          type: "string",
          description: "e.g. Residential, Condominium, Land, MultiFamily",
        },
        limit: { type: "number", description: "Max results, default 10, max 25" },
      },
    },
  },
  {
    name: "get_listing_detail",
    description:
      "Get full details (description, photos count, listing agent, etc.) for a single property by its listingKey. Use after search_listings when the user wants to know more about a specific result.",
    input_schema: {
      type: "object",
      properties: {
        listingKey: { type: "string" },
      },
      required: ["listingKey"],
    },
  },
  {
    name: "get_comparables",
    description:
      "Get recently sold comparable properties near a given listing, useful for pricing discussions and 'is this a good deal' questions.",
    input_schema: {
      type: "object",
      properties: {
        listingKey: { type: "string" },
        monthsBack: { type: "number", description: "How many months back to search, default 6" },
      },
      required: ["listingKey"],
    },
  },
];

export async function executeTool(name, input) {
  switch (name) {
    case "search_listings":
      return await searchListings(input);
    case "get_listing_detail":
      return await getListingDetail(input.listingKey);
    case "get_comparables":
      return await getComparables(input.listingKey, input.monthsBack);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
