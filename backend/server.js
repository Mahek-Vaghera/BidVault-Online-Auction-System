import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter"; // Fix 1: Import specifically

import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import connectDB from "./services/db.service.js";
import { initializeSocketHandlers } from "./services/socket.service.js";
import { startAuctionCompletionJob } from "./services/auction.completion.service.js";

const app = express();
app.set("trust proxy", true);

const createRedisOptions = () => {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return {
      url: redisUrl,
      tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
  };
};

const redisOptions = createRedisOptions();

let pubClient = null;
let subClient = null;
const hasTcpRedisConfig = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST || process.env.REDIS_PORT);

if (hasTcpRedisConfig) {
  pubClient = new Redis(redisOptions.url || redisOptions);
  subClient = pubClient.duplicate();
}

const httpServer = createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

const ioConfig = {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
};

if (pubClient && subClient) {
  ioConfig.adapter = createAdapter(pubClient, subClient);
} else {
  console.warn("Socket.IO Redis adapter disabled: REDIS_URL/REDIS_HOST not configured. Running with in-memory adapter.");
}

const io = new Server(httpServer, ioConfig);

// connect to db
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
    // Start auction completion job
    startAuctionCompletionJob(io);
  })
  .catch((err) => {
    console.error("Database connection failed");
  });

// Make io available to all routes via app.locals
app.locals.io = io;

// Initialize Socket.IO handlers
initializeSocketHandlers(io);

//middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());       
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
})); 

// home page
app.get("/", (req, res) => res.send("BidVault Online Auction System") );

// auth routes
import authRoutes from "./routes/auth.routes.js";
app.use("/bidvault/auth", authRoutes);
// Alias routes without the `/bidvault` prefix for compatibility with deployed frontend
app.use("/auth", authRoutes);

// admin routes
import adminRoutes from "./routes/admin.routes.js";
app.use("/bidvault/admin", adminRoutes);
app.use("/admin", adminRoutes);

// auction routes
import auctionRoutes from "./routes/auction.routes.js";
app.use("/bidvault/auctions", auctionRoutes);
app.use("/auctions", auctionRoutes);

// bid routes
import bidRoutes from "./routes/bid.routes.js";
app.use("/bidvault/auctions/:auctionId", bidRoutes);
app.use("/auctions/:auctionId", bidRoutes);

// leaderboard routes
import leaderboardRoutes from "./routes/leaderboard.routes.js";
app.use("/bidvault/auctions", leaderboardRoutes);
app.use("/auctions", leaderboardRoutes);

// error handling middleware
app.use(errorHandler);   

export default app;