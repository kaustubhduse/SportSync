import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { config } from "../config/env.js";

let localPineIndex;

async function initPinepine() {
  if (!localPineIndex) {
    const pinecone = new Pinecone({
      apiKey: config.pineconeApiKey,
      environment: config.pineconeEnvironment,
    });

    localPineIndex = pinecone.Index(config.pineconeIndexName);
  }
}

export async function queryDocuments(question, topK = 5) {
  await initPinepine();

  const embeddingModel = new OpenAIEmbeddings({
    openAIApiKey: config.openaiApiKey,
  });

  // Get embedding vector for the question
  const qVec = await embeddingModel.embedQuery(question);

  const queryResponse = await localPineIndex.query({
    topK,
    vector: qVec,
    includeMetadata: true,
  });

  const matches = queryResponse.matches || [];
  const contexts = matches.map((m) => m.metadata.text);

  const prompt = `
You are an assistant. Use the following retrieved context to answer the question.
Context:
${contexts.join("\n---\n")}

Question: ${question}

Answer:
  `;

  const llm = new ChatOpenAI({
    modelName: config.openaiModel, 
    temperature: 0.0,
    openAIApiKey: config.openaiApiKey,
  });

  // Use .call() with { role, content } array
  const resp = await llm.call([{ role: "user", content: prompt }]);

  return resp.text ?? resp;
}
