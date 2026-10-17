import "dotenv/config";
import http from "http";
import mongoose from "mongoose";
import app from "./src/app.js";
import { initSocket } from "./src/socket.js";

const server = http.createServer(app);
initSocket(server);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("DB connection failed:", err.message));
