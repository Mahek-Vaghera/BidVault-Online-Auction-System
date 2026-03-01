import Auction from "../models/auction.model.js";
import Bid from "../models/bid.model.js";
import AutoBid from "../models/autobid.model.js";
import User from "../models/user.model.js";
import { createAuctionLog } from "./log.service.js";
import { SendOutBidEmail } from "./mail_service/email.sender.js";
import { getDisplayName } from "./leaderboard.service.js";
import { acquireDistributedLock, releaseDistributedLock } from "./redis.service.js";

export const placeBidWithLock = async (
  auctionId,
  userId,
  bidAmount,
  io
) => {
  const lockKey = `bid-lock:${auctionId}`;
  let lock;

  try {
    // Acquire lock with 5-second timeout
    lock = await acquireDistributedLock(lockKey, 5000, 10000, 50);

    // Re-fetch auction to ensure latest state
    const auction = await Auction.findById(auctionId);
    if (!auction || auction.status !== "LIVE") {
      throw new Error("Auction is not active");
    }

    // Verify bid amount
    const minBidRequired = auction.currentBid > 0
      ? auction.currentBid + auction.minIncrement
      : auction.startingPrice;

    if (bidAmount < minBidRequired) {
      throw new Error(
        `Bid amount must be at least ${minBidRequired} (current: ${auction.currentBid}, increment: ${auction.minIncrement})`
      );
    }

    // Check if user has active auto-bid
    const activeAutoBid = await AutoBid.findOne({
      auctionId,
      userId,
      isActive: true
    });

    if (activeAutoBid) {
      throw new Error(
        "You have an active auto-bid. Deactivate it before placing manual bids."
      );
    }

    // Update or create bid
    let bid = await Bid.findOne({ auctionId, userId });
    if (bid) {
      bid.oldBidAmounts.push(bid.amount);
      bid.amount = bidAmount;
      await bid.save();
    } else {
      bid = await Bid.create({
        auctionId,
        userId,
        amount: bidAmount
      });
    }

    // Deactivate all auto-bids for this user on this auction
    await AutoBid.updateMany(
      { auctionId, userId },
      { isActive: false }
    );

    // Update auction
    auction.currentBid = bidAmount;
    auction.currentWinner = userId;
    auction.totalBids += 1;
    await auction.save();

    // Get user details
    const user = await User.findById(userId);

    // Create log
    await createAuctionLog({
      auctionId,
      userId,
      userName: getDisplayName(user),
      type: "MANUAL_BID_PLACED",
      details: { amount: bidAmount }
    });

    // Check for auction extension (last 2 minutes)
    const now = new Date();
    const timeDiff = auction.endTime - now;

    if (timeDiff <= 2 * 60 * 1000 && timeDiff > 0) {
      auction.endTime = new Date(auction.endTime.getTime() + 10 * 60 * 1000);
      await auction.save();

      await createAuctionLog({
        auctionId,
        userName: "System",
        type: "AUCTION_EXTENDED",
        details: {
          reason: "Last minute bid - extended by 10 minutes",
          newEndTime: auction.endTime
        }
      });

      // Emit extension event
      if (io) {
        io.to(`auction:${auctionId}`).emit("auction-extended", {
          auctionId,
          newEndTime: auction.endTime,
          message: "Auction extended by 10 minutes!",
          timestamp: new Date()
        });
      }
    }

    // Release lock
    await releaseDistributedLock(lock);

    return { success: true, bid, auction };
  } catch (error) {
    // Release lock on error
    await releaseDistributedLock(lock);
    throw error;
  }
};

export const validateBidLogic = async (auctionId, userId, bidAmount) => {
  const auction = await Auction.findById(auctionId);
  if (!auction) throw new Error("Auction not found");
  if (auction.status !== "LIVE") throw new Error("Auction is not active");

  const isRegistered = auction.registrations.some(
    (reg) => reg.toString() === userId.toString()
  );
  if (!isRegistered) throw new Error("You are not registered for this auction");

  const minBidRequired = auction.currentBid > 0
    ? auction.currentBid + auction.minIncrement
    : auction.startingPrice;

  if (bidAmount < minBidRequired) {
    throw new Error(
      `Bid must be at least ${minBidRequired}`
    );
  }

  return { valid: true, auction };
};