import { catchErrors } from "../utils/catchErrors.js";
import Bid from "../models/bid.model.js";
import Auction from "../models/auction.model.js";
import User from "../models/user.model.js";
import { buildAuctionLeaderboard, getDisplayName } from "../services/leaderboard.service.js";

// Get top 10 bidders for an auction
export const getLeaderboard = catchErrors(async (req, res) => {
  const { auctionId } = req.params;

  const result = await buildAuctionLeaderboard(auctionId);
  if (!result.auction) {
    return res.status(404).json({
      success: false,
      message: "Auction not found"
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      auctionId,
      auctionTitle: result.auction.title,
      leaderboard: result.leaderboard,
      totalBids: result.totalBids,
      currentHighestBid: result.currentHighestBid
    }
  });
});

// Get bidding history for auction
export const getBiddingHistory = catchErrors(async (req, res) => {
  const { auctionId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  // Verify auction exists
  const auction = await Auction.findById(auctionId);
  if (!auction) {
    return res.status(404).json({
      success: false,
      message: "Auction not found"
    });
  }

  const skip = (page - 1) * limit;

  // Get bids with pagination
  const bids = await Bid.find({ auctionId })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate("userId", "username fullname email");

  const total = await Bid.countDocuments({ auctionId });

  // Format bidding history
  const history = bids.map((bid) => ({
    bidId: bid._id,
    userId: bid.userId._id,
    userName: getDisplayName(bid.userId),
    currentBid: bid.amount,
    bidCount: bid.oldBidAmounts.length + 1,
    lastBidTime: bid.updatedAt,
    isCurrentWinner: String(bid.userId._id) === String(auction.currentWinner)
  }));

  return res.status(200).json({
    success: true,
    data: {
      auctionId,
      history,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// Get user's bid details for an auction
export const getUserBidDetails = catchErrors(async (req, res) => {
  const { auctionId } = req.params;
  const userId = req.user._id;

  // Verify auction exists
  const auction = await Auction.findById(auctionId);
  if (!auction) {
    return res.status(404).json({
      success: false,
      message: "Auction not found"
    });
  }

  // Get user's bid
  const userBid = await Bid.findOne({ auctionId, userId });
  if (!userBid) {
    return res.status(404).json({
      success: false,
      message: "You haven't placed any bid in this auction"
    });
  }

  // Calculate rank
  const higherBids = await Bid.countDocuments({
    auctionId,
    amount: { $gt: userBid.amount }
  });
  const rank = higherBids + 1;

  const user = await User.findById(userId);

  return res.status(200).json({
    success: true,
    data: {
      userId,
      userName: getDisplayName(user),
      currentBid: userBid.amount,
      bidHistory: userBid.oldBidAmounts,
      totalBidsPlaced: userBid.oldBidAmounts.length + 1,
      rank,
      isCurrentWinner: String(userId) === String(auction.currentWinner),
      isOutbidded: rank > 1,
      auctionStatus: auction.status
    }
  });
});