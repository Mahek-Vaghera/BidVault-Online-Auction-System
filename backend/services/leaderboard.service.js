import Bid from "../models/bid.model.js";
import Auction from "../models/auction.model.js";

export const buildAuctionLeaderboard = async (auctionId) => {
  const auction = await Auction.findById(auctionId);
  if (!auction) {
    return {
      auction: null,
      leaderboard: [],
      totalBids: 0,
      currentHighestBid: 0,
    };
  }

  const topBids = await Bid.find({ auctionId })
    .sort({ amount: -1, updatedAt: 1 })
    .limit(10)
    .populate("userId", "username fullname email");

  const leaderboard = topBids.map((bid, index) => {
    const bidder = bid.userId;
    const userName = bidder?.fullname || bidder?.username || bidder?.email || "Unknown";

    return {
      rank: index + 1,
      userId: bidder?._id || bid.userId,
      userName,
      bidAmount: bid.amount,
      bidDate: bid.updatedAt,
      isCurrentWinner: String(bid.userId?._id || bid.userId) === String(auction.currentWinner),
      previousBids: bid.oldBidAmounts?.length || 0,
    };
  });

  return {
    auction,
    leaderboard,
    totalBids: auction.totalBids,
    currentHighestBid: auction.currentBid,
  };
};

export const getDisplayName = (user) => {
  if (!user) return "Unknown";
  return user.fullname || user.username || user.email || "Unknown";
};