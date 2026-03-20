import Auction from "../models/auction.model.js";
import AutoBid from "../models/autobid.model.js";
import Bid from "../models/bid.model.js";
import User from "../models/user.model.js";
import { SendOutBidEmail } from "./mail_service/email.sender.js";
import { createAuctionLog } from "./log.service.js";
import { buildAuctionLeaderboard, getDisplayName } from "./leaderboard.service.js";
import { acquireDistributedLock, releaseDistributedLock } from "./redis.service.js";
import { invalidateAuctionMutationCaches } from "./cache-invalidation.service.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


export const handleAutoBids = async (auctionId, io = null, options = {}) => {
  const lockKey = `autobid-lock:${auctionId}`;
  let lock;
  const bidStepDelayMs = Math.max(
    0,
    Number(options.bidStepDelayMs ?? process.env.AUTOBID_STEP_DELAY_MS ?? 1000) || 0
  );

  try {
    lock = await acquireDistributedLock(lockKey, 15000, 15000, 50);

    let cycleGuard = 0;
    while (cycleGuard < 100) {
      cycleGuard += 1;

      const auction = await Auction.findById(auctionId);
      if (!auction || auction.status !== "LIVE") break;

      let currentBid = Math.max(auction.currentBid, auction.startingPrice);
      const minIncrement = auction.minIncrement;

      // Find all active autobids, sorted by max limit desc and earliest setup first.
      const autoBidders = await AutoBid.find({ auctionId, isActive: true })
        .sort({ maxLimit: -1, createdAt: 1 })
        .select("userId maxLimit isActive lastBidAmount totalAutoBidsPlaced lastTriggeredAt");

      if (!autoBidders.length) break;

      let bidPlacedThisCycle = false;

      for (const autobid of autoBidders) {
        const bidderId = autobid.userId;
        const previousWinnerId = auction.currentWinner;
        // Skip if this bidder already has the highest bid.
        if (String(bidderId) === String(auction.currentWinner)) continue;

        const user = await User.findById(bidderId);
        if (!user) {
          console.warn(`User with ID ${bidderId} not found for auto-bid processing.`);
          continue;
        }

        const nextBid = currentBid + minIncrement;

        // Deactivate if max limit is exceeded.
        if (nextBid > autobid.maxLimit) {
          try {
            await SendOutBidEmail(
              user.email,
              auction.title,
              currentBid,
              autobid.maxLimit,
              auctionId,
              auction.title
            );
          } catch (emailErr) {
            console.error("Error sending outbid email:", emailErr);
          }

          autobid.isActive = false;
          await autobid.save();
          continue;
        }

        let bid = await Bid.findOne({ auctionId, userId: bidderId });
        if (bid) {
          bid.oldBidAmounts.push(bid.amount);
          bid.amount = nextBid;
          await bid.save();
        } else {
          await Bid.create({
            auctionId,
            userId: bidderId,
            amount: nextBid
          });
        }

        autobid.lastBidAmount = nextBid;
        autobid.lastTriggeredAt = new Date();
        autobid.totalAutoBidsPlaced += 1;
        await autobid.save();

        auction.currentBid = nextBid;
        auction.currentWinner = bidderId;
        auction.totalBids += 1;
        await auction.save();

        await createAuctionLog({
          auctionId,
          userId: bidderId,
          userName: getDisplayName(user),
          type: "AUTO_BID_TRIGGERED",
          details: { bidAmount: nextBid }
        });

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
              reason: "Auto-bid placed in last 2 minutes - extended by 10 minutes",
              newEndTime: auction.endTime
            }
          });

          if (io) {
            io.to(`auction:${auctionId}`).emit("auction-extended", {
              auctionId,
              newEndTime: auction.endTime,
              message: "Auction extended by 10 minutes!",
              timestamp: new Date()
            });
          }
        }

        if (io) {
          io.to(`auction:${auctionId}`).emit("bid-update", {
            auctionId,
            currentBid: auction.currentBid,
            currentWinner: user._id,
            winnerName: getDisplayName(user),
            totalBids: auction.totalBids,
            timestamp: new Date()
          });

          const lb = await buildAuctionLeaderboard(auctionId);
          io.to(`auction:${auctionId}`).emit("leaderboard-update", {
            auctionId,
            leaderboard: lb.leaderboard,
            timestamp: new Date()
          });
        }

        await invalidateAuctionMutationCaches({
          auctionId,
          previousStatus: "LIVE",
          nextStatus: auction.status,
          creatorId: auction.createdBy,
          affectedUserIds: [bidderId, previousWinnerId],
        });

        bidPlacedThisCycle = true;
        break; // Only one auto-bid step per cycle.
      }

      if (!bidPlacedThisCycle) break;

      // Pace competing autobids so users can see rank changes progressively.
      if (bidStepDelayMs > 0) {
        await delay(bidStepDelayMs);
      }
    }
  } catch (error) {
    console.error("Error handling auto-bids:", error);
  } finally {
    await releaseDistributedLock(lock);
  }
};