import { Router } from "express";
import { runChat } from "./claudeAgent.js";

const router = Router();

const REALTOR_SYSTEM_PROMPT = `You are an assistant for a licensed real estate agent (realtor), embedded in their internal work app.

You help the realtor:
- Search and filter MLS listings quickly for their own review or to send to clients
- Pull comparable sold properties to support pricing conversations with sellers
- Get full listing details, including listing agent contact info
- Draft short, professional listing descriptions or client-facing summaries when asked

Tone: professional, concise, efficient — this is a working tool for someone busy, not a customer-facing chat.
Always use the available tools to look up real data rather than guessing at prices, addresses, or availability.
If a request is ambiguous (e.g. no location given), ask one quick clarifying question before searching.
Never fabricate listing details, prices, or agent contact information — only report what the tools return.`;

router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const { reply, messages: updatedMessages } = await runChat(REALTOR_SYSTEM_PROMPT, messages, "realtor");
    res.json({ reply, messages: updatedMessages });
  } catch (err) {
    console.error("Realtor chat error:", err);
    res.status(500).json({ error: "Something went wrong processing that request." });
  }
});

export default router;
