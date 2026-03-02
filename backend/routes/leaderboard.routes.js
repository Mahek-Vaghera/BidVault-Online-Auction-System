import express from "express";
import { restrictToLoggedInUserOnly } from "../middlewares/auth.middleware.js";
import {
  getLeaderboard,
  getBiddingHistory,
  getUserBidDetails
} from "../controllers/leaderboard.controller.js";

const router = express.Router();

// Get top 10 bidders leaderboard
router.get("/:auctionId/leaderboard", getLeaderboard);

// Get bidding history with pagination
router.get(
  "/:auctionId/history",
  restrictToLoggedInUserOnly,
  getBiddingHistory
);

// Get current user's bid details
router.get(
  "/:auctionId/my-bid",
  restrictToLoggedInUserOnly,
  getUserBidDetails
);

export default router;