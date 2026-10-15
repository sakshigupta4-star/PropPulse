import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

import propertyRoutes from "./routes/propertyRoutes.js";
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;