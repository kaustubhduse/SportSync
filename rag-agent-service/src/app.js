import express from "express";
import { config } from "./config/env.js";
import ragRoutes from "./routes/rag.routes.js";

const app = express();
app.use(express.json());

// mount routes
app.use("/api/rag", ragRoutes);

app.get("/", (req, res) => {
  res.json({ status: "rag-agent-service OK" });
});

export default app;
