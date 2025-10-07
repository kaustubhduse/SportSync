import { ChatTogetherAI } from "@langchain/community/chat_models/togetherai";
import { config } from "../config/env.js";

export function getLLM() {
  return new ChatTogetherAI({
    model: config.togetherModel,
    temperature: 0.0
  });
}

export async function askLLM(prompt) {
  const llm = getLLM();
  const resp = await llm.invoke([["user", prompt]]);
  return resp.text ?? resp;
}
