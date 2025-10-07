import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { config } from "../config/env.js";

export let pineIndex;

async function initPinecone() {
  if (!pineIndex) {
    const pinecone = new Pinecone({
      apiKey: config.pineconeApiKey,
      environment: config.pineconeEnvironment,
    });

    pineIndex = pinecone.Index(config.pineconeIndexName);
  }
}

export async function indexDocuments(docs) {
  await initPinecone();

  const embeddingModel = new OpenAIEmbeddings({
    openAIApiKey: config.openaiApiKey,
  });

  const batch = [];

  for (const doc of docs) {
    const embedding = await embeddingModel.embedQuery(doc.text);
    batch.push({
      id: doc.id,
      values: embedding,
      metadata: { text: doc.text },
    });
  }

  await pineIndex.upsert({ vectors: batch });
}
