  import cron from "cron";
  import { fetchAllDocs } from "../utils/fetchData.js";
  import { indexDocuments } from "../utils/indexer.js";

  const schedule = cron.CronJob;
  const job = new schedule("0 */6 * * *", async () => {
    try {
      console.log("🔄 Cron: Fetching and indexing documents...");
      const docs = await fetchAllDocs();
      await indexDocuments(docs);
      console.log("✅ Indexed", docs.length, "documents");
    } catch (err) {
      console.error("Error in cron indexing:", err);
    }
  });

  job.start();
  console.log("Cron job for RAG indexing started");
