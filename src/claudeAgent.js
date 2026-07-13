/**
 * claudeAgent.js
 * --------------
 * Runs the Claude tool-use loop: sends the conversation + tool defs,
 * executes any tool calls Claude makes against the MLS client, feeds
 * results back, and repeats until Claude returns a final text answer.
 */

import Anthropic from "@anthropic-ai/sdk";
import { BASE_TOOLS, executeTool } from "./tools.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const MAX_TOOL_ROUNDS = 5;

/**
 * @param {string} systemPrompt - role-specific instructions (realtor vs buyer)
 * @param {Array}  messages - conversation history, e.g. [{role:"user", content:"..."}]
 * @returns {Promise<{reply: string, messages: Array}>} final assistant text + full updated history
 */
export async function runChat(systemPrompt, messages) {
  let convo = [...messages];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      tools: BASE_TOOLS,
      messages: convo,
    });

    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

    if (toolUseBlocks.length === 0) {
      // No tools called — this is the final answer.
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      convo.push({ role: "assistant", content: response.content });
      return { reply: text, messages: convo };
    }

    // Claude wants to call one or more tools — execute them and loop.
    convo.push({ role: "assistant", content: response.content });

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        try {
          const result = await executeTool(block.name, block.input);
          return {
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        } catch (err) {
          return {
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({ error: err.message }),
            is_error: true,
          };
        }
      })
    );

    convo.push({ role: "user", content: toolResults });
  }

  return {
    reply: "I wasn't able to finish looking that up — could you narrow your question a bit?",
    messages: convo,
  };
}
