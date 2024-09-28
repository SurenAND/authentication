import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";

import { connectDB } from "./db/connectDB.js";
import authRouter from "./routes/auth.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));

app.use(express.json()); // allow us to parse json bodies in requests
app.use(cookieParser()); // allow us to parse cookies in requests

app.use("/api/auth", authRouter);

// Serve static files from the frontend/dist directory
app.use(express.static(path.join(__dirname, "/frontend/dist")));

// Handle all other routes by serving the index.html file
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
});

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
