/**
 * mockResponses.js
 * ----------------
 * Canned replies used when MOCK_MODE=true, so you can click through the
 * full buyer/realtor experience without spending Anthropic API credits
 * or needing real MLS access. Picks a response based on keywords in the
 * user's last message; falls back to a generic one otherwise.
 *
 * This is for demoing the UI/UX only — the replies are fake and never
 * touch the real MLS feed. Turn MOCK_MODE off before relying on real
 * answers for real users.
 */

const BUYER_RESPONSES = [
  {
    keywords: ["contingency"],
    reply:
      "A contingency is a condition that has to be met before a home sale finalizes. Common ones: an inspection contingency (lets you back out or renegotiate if problems turn up), a financing contingency (protects you if your loan falls through), and an appraisal contingency (protects you if the home appraises for less than the offer price).\n\n*(Mock response — MOCK_MODE is on, this didn't call the real API.)*",
  },
  {
    keywords: ["mortgage", "fixed", "adjustable", "arm"],
    reply:
      "A fixed-rate mortgage keeps the same interest rate for the entire loan term, so your principal + interest payment never changes. An adjustable-rate mortgage (ARM) starts with a lower introductory rate, then adjusts periodically based on market rates — it can go up or down after the fixed period ends.\n\n*(Mock response — MOCK_MODE is on, this didn't call the real API.)*",
  },
  {
    keywords: ["bed", "bath", "under", "$", "near", "found"],
    reply:
      "Here's what I'd normally find for you:\n\n**214 Maple St** — $349,000 · 3 bed / 2 bath / 1,650 sqft\n**88 Birch Ave** — $362,500 · 3 bed / 2.5 bath / 1,800 sqft\n**501 Oakwood Dr** — $391,000 · 4 bed / 2 bath / 2,100 sqft\n\n*(Mock response — these are fake listings for demo purposes. MOCK_MODE is on.)*",
  },
];

const REALTOR_RESPONSES = [
  {
    keywords: ["draft", "description", "listing copy"],
    reply:
      "Charming 4-bedroom craftsman with a classic wraparound porch, perfect for morning coffee or evening entertaining. Inside, warm hardwood floors and abundant natural light complement a thoughtfully updated kitchen and spacious living areas.\n\n*(Mock response — MOCK_MODE is on, this didn't call the real API.)*",
  },
  {
    keywords: ["comp", "comparable"],
    reply:
      "Here's what comps would normally look like:\n\n**412 Willow Ln** — Sold $358,000 · Closed 03/2026 · 3bd/2ba/1,720sqft\n**67 Cedar Ct** — Sold $371,200 · Closed 02/2026 · 3bd/2ba/1,690sqft\n\nBased on these, the subject property looks reasonably priced.\n\n*(Mock response — these are fake comps for demo purposes. MOCK_MODE is on.)*",
  },
  {
    keywords: ["active", "listings", "under"],
    reply:
      "Here's what I'd normally pull:\n\n**214 Maple St** — $349,000 · 3bd/2ba · Active\n**88 Birch Ave** — $362,500 · 3bd/2.5ba · Active\n\n*(Mock response — these are fake listings for demo purposes. MOCK_MODE is on.)*",
  },
];

const GENERIC_FALLBACK =
  "This is a mock response — MOCK_MODE is on, so no real API call was made and no real listing data was used. Turn MOCK_MODE off (and add Anthropic credits) to get real answers.";

export function getMockReply(role, lastUserMessage) {
  const text = (lastUserMessage || "").toLowerCase();
  const pool = role === "realtor" ? REALTOR_RESPONSES : BUYER_RESPONSES;

  const match = pool.find((entry) =>
    entry.keywords.some((kw) => text.includes(kw))
  );

  return match ? match.reply : GENERIC_FALLBACK;
}
