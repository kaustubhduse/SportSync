import app from "./app.js";
import { config } from "./config/env.js";
import "./config/cron.js";  // starts cron job

app.listen(config.port, () => {
  console.log(`RAG Agent service listening on port ${config.port}`);
});
