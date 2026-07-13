# Realtor + Buyer LLM Backend

A small Express service that gives your app two chat endpoints — one for
realtors, one for buyers — both backed by Claude with live access to your
MLS data feed via tool-use (function calling). Claude decides when to
search listings, pull details, or fetch comps; you don't hand-write query
logic for every possible question.

## How it fits together

```
Your App (mobile/web)
   |
   |-- POST /api/realtor/chat   (agent-facing tools)
   |-- POST /api/buyer/chat     (customer-facing tools)
   |
   v
This backend
   |
   |-- claudeAgent.js   runs the Claude tool-use loop
   |-- tools.js         defines what Claude can look up
   |-- mlsClient.js      talks to your MLS (RESO Web API)
   |
   v
Your MLS / MLS aggregator (Spark, Trestle, Bridge, MLS Grid, etc.)
```

Both routes share the same underlying tools (`search_listings`,
`get_listing_detail`, `get_comparables`). What differs is the **system
prompt** for each — that's what makes the realtor experience
internal/efficient and the buyer experience friendly/guarded. See
`realtorRoute.js` and `buyerRoute.js`.

## Setup

```bash
npm install
cp .env.example .env
# fill in ANTHROPIC_API_KEY, MLS_BASE_URL, MLS_TOKEN
npm start
```

Server runs on `http://localhost:3000` by default.

## API

Both endpoints take the same shape:

**POST `/api/realtor/chat`** or **POST `/api/buyer/chat`**

Request:
```json
{
  "messages": [
    { "role": "user", "content": "3 bed homes under 400k in Greenwood SC" }
  ]
}
```

Response:
```json
{
  "reply": "I found 4 active listings in Greenwood under $400k with 3+ beds...",
  "messages": [ /* full updated conversation, pass this back in on the next turn */ ]
}
```

Your app should store `messages` (or just append to it) and send the
whole array back on each turn — the backend is stateless between requests.

## Adapting to your MLS provider

This is built against **RESO Web API** (OData), the standard most MLS
aggregators speak. If yours differs:

- Only `src/mlsClient.js` needs changes — field names, auth headers, and
  the base query format.
- Everything else (`tools.js`, `claudeAgent.js`, the routes) stays the
  same, since they only call the exported functions
  (`searchListings`, `getListingDetail`, `getComparables`), not the raw API.

## Extending it

- **Realtor-only tools** (private remarks, seller net sheets, commission
  data): add new tool definitions to `tools.js`, then only register them
  in `realtorRoute.js`'s tool list rather than the shared `BASE_TOOLS`.
- **Saved searches / favorites**: add a small persistence layer (e.g.
  Postgres or your app's existing DB) and new tools like
  `save_search` / `list_favorites` that the buyer route can call.
- **Auth**: this skeleton has no auth — add your app's existing
  auth middleware in front of both routes before shipping.
- **Streaming**: swap `anthropic.messages.create` for
  `anthropic.messages.stream` in `claudeAgent.js` if you want token-by-token
  responses in your app's UI.

## Notes on the MLS integration

- Listings default to `StandardStatus eq 'Active'` unless a status is
  specified, so buyers don't see off-market properties by accident.
- `get_comparables` looks up recently **closed** sales near a listing's
  zip code with a similar bed count — useful for "is this priced fairly"
  questions, both for buyers and for realtors pricing a listing.
- Only a curated set of fields is returned to Claude (see
  `simplifyListing` in `mlsClient.js`) to keep responses fast and avoid
  leaking internal-only MLS fields to the buyer-facing route.
