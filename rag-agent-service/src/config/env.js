import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 8080,

  // OpenAI config
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-3.5-turbo",

  // PostgreSQL connections
  pgAuthConn: process.env.PG_AUTH_CONN,
  pgUserConn: process.env.PG_USER_CONN,

  // MongoDB connections
  mongoEventUri: process.env.MONGO_EVENT_URI,
  mongoAuctionUri: process.env.MONGO_AUCTION_URI,
  mongoLiveScoreUri: process.env.MONGO_LIVESCORE_URI,
  mongoPaymentUri: process.env.MONGO_PAYMENT_URI,

  // Pinecone config
  pineconeApiKey: process.env.PINECONE_API_KEY,
  pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
  pineconeIndexName: process.env.PINECONE_INDEX_NAME,
};
