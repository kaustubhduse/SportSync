import express from "express";
import userRoutes from "./routes/user.routes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/users", userRoutes);

app.get("/", (req, res) => {
    res.send("User Service is running");
});

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
});
