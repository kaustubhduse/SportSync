import { Pool } from "pg";
import { MongoClient } from "mongodb";
import { config } from "../config/env.js";

let pgAuthPool, pgUserPool;
let mongoEventClient, mongoAuctionClient, mongoLiveClient, mongoPaymentClient;

async function initPgPools() {
  if (!pgAuthPool) {
    pgAuthPool = new Pool({ connectionString: config.pgAuthConn });
  }
  if (!pgUserPool) {
    pgUserPool = new Pool({ connectionString: config.pgUserConn });
  }
}

async function initMongoClients() {
  if (!mongoEventClient) {
    mongoEventClient = new MongoClient(config.mongoEventUri);
    await mongoEventClient.connect();
  }
  if (!mongoAuctionClient) {
    mongoAuctionClient = new MongoClient(config.mongoAuctionUri);
    await mongoAuctionClient.connect();
  }
  if (!mongoLiveClient) {
    mongoLiveClient = new MongoClient(config.mongoLiveScoreUri);
    await mongoLiveClient.connect();
  }
  if (!mongoPaymentClient) {
    mongoPaymentClient = new MongoClient(config.mongoPaymentUri);
    await mongoPaymentClient.connect();
  }
}

export async function fetchAllDocs() {
  await Promise.all([ initPgPools(), initMongoClients() ]);

  const docs = [];

  // Postgres: auth (just users list)
  const authRes = await pgAuthPool.query("SELECT id, email FROM users");
  authRes.rows.forEach(u => {
    docs.push({ id: `auth:${u.id}`, text: `User (auth) ${u.email}` });
  });

  // Postgres: user profiles
  const userRes = await pgUserPool.query("SELECT id, name, bio FROM users");
  userRes.rows.forEach(u => {
    docs.push({ id: `user:${u.id}`, text: `User ${u.name}: ${u.bio || ""}` });
  });

  // Mongo: event
  const eventColl = mongoEventClient.db().collection("events");
  const events = await eventColl.find({}).toArray();
  events.forEach(e => {
    docs.push({
      id: `event:${e._id}`,
      text: `Event ${e.name} on ${e.date}. ${e.description || ""}`
    });
  });

  // Mongo: auction
  const auctionColl = mongoAuctionClient.db().collection("auctions");
  const auctions = await auctionColl.find({}).toArray();
  auctions.forEach(a => {
    docs.push({
      id: `auction:${a._id}`,
      text: `Auction ${a.name}: winners ${ (a.winners || []).join(", ") }`
    });
  });

  // Mongo: live-score
  const liveColl = mongoLiveClient.db().collection("matches");
  const matches = await liveColl.find({}).toArray();
  matches.forEach(m => {
    docs.push({
      id: `match:${m._id}`,
      text: `Match ${m.matchName}: ${m.scoreSummary || ""}`
    });
  });

  // Mongo: payment
  const payColl = mongoPaymentClient.db().collection("payments");
  const payments = await payColl.find({}).toArray();
  payments.forEach(p => {
    docs.push({
      id: `payment:${p._id}`,
      text: `Payment for user ${p.userId} - status: ${p.status}`
    });
  });

  return docs;
}
