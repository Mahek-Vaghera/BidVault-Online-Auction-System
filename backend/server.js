import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";

import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import connectDB from "./services/db.service.js";
import { initializeSocketHandlers } from "./services/socket.service.js";
import { startAuctionCompletionJob } from "./services/auction.completion.service.js";

import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import auctionRoutes from "./routes/auction.routes.js";
import bidRoutes from "./routes/bid.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";

const app = express();
app.set("trust proxy", true);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());


const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);

let io;

try {
  const redisUrl = process.env.REDIS_URL;

  const pubClient = redisUrl
    ? new Redis(redisUrl)
    : null;

  const subClient = pubClient
    ? pubClient.duplicate()
    : null;

  const httpServer = createServer(app);

  const ioConfig = {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  };

  if (pubClient && subClient) {
    ioConfig.adapter = createAdapter(pubClient, subClient);
  }

  io = new Server(httpServer, ioConfig);

  app.locals.io = io;

  initializeSocketHandlers(io);

  app.get("/", (req, res) => {
    res.send("BidVault Online Auction System");
  });

  app.use("/auth", authRoutes);
  app.use("/bidvault/auth", authRoutes);

  app.use("/admin", adminRoutes);
  app.use("/bidvault/admin", adminRoutes);

  app.use("/auctions", auctionRoutes);
  app.use("/bidvault/auctions", auctionRoutes);

  app.use("/auctions/:auctionId", bidRoutes);
  app.use("/bidvault/auctions/:auctionId", bidRoutes);

  app.use("/auctions", leaderboardRoutes);
  app.use("/bidvault/auctions", leaderboardRoutes);

  app.use(errorHandler);

  const PORT = process.env.PORT || 5000;

  connectDB()
    .then(() => {
      httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);

        startAuctionCompletionJob(io);
      });
    })
    .catch((err) => {
      console.error("Database connection failed:", err);
    });

} catch (err) {
  console.error("Server startup error:", err);
}

export default app;