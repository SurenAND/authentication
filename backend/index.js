import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";

import { connectDB } from "./db/connectDB.js";
import authRouter from "./routes/auth.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json()); // allow us to parse json bodies in requests
app.use(cookieParser()); // allow us to parse cookies in requests

app.use("/api/auth", authRouter);

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
