import { indexDocuments } from "../utils/indexer.js";
import { queryDocuments } from "../utils/retriever.js";

export async function indexHandler(req, res) {
  try {
    const { docs } = req.body;  
    if (docs && Array.isArray(docs)) {
      await indexDocuments(docs);
      return res.json({ message: "Indexed custom docs", count: docs.length });
    }
    
    const { fetchAllDocs } = await import("../utils/fetchData.js");
    const allDocs = await fetchAllDocs();
    await indexDocuments(allDocs);
    return res.json({ message: "Full indexing done", count: allDocs.length });
  } catch (err) {
    console.error("Error in indexHandler:", err);
    return res.status(500).json({ error: "Indexing failed", details: err.toString() });
  }
}

export async function queryHandler(req, res) {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }
    const answer = await queryDocuments(question);
    return res.json({ answer });
  } catch (err) {
    console.error("Error in queryHandler:", err);
    return res.status(500).json({ error: "Query failed", details: err.toString() });
  }
}
