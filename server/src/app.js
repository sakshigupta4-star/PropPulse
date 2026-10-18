import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import { notFound, errorHandler } from "./middleware/error.js";
import builderRoutes from "./routes/builderRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import investmentRoutes from "./routes/investmentRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";


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
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/builders", builderRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/investment", investmentRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
