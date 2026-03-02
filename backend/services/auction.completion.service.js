import cron from "node-cron";
import Auction from "../models/auction.model.js";
import User from "../models/user.model.js";
import { createAuctionLog } from "./log.service.js";
import { getDisplayName } from "./leaderboard.service.js";
import { handleAutoBids } from "./autobid.service.js";
import { cacheDeleteByPrefix } from "./cache.service.js";
// import { SendAuctionEndedEmail } from "./mail_service/email.sender.js";

const invalidateAuctionCaches = async (auctionId) => {
  await Promise.all([
    cacheDeleteByPrefix("cache:auctions:list:"),
    cacheDeleteByPrefix("cache:my-auctions:"),
    cacheDeleteByPrefix("cache:admin:overview"),
    cacheDeleteByPrefix("cache:admin:auctions:"),
    cacheDeleteByPrefix("cache:admin:payments"),
    cacheDeleteByPrefix("cache:admin:deliveries"),
    cacheDeleteByPrefix(`cache:auction:${auctionId}:`),
  ]);
};

export const startAuctionCompletionJob = (io) => {
  // Run every minute to check for ended auctions
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Move upcoming auctions to LIVE when start time is reached and they have registrations.
      const toLive = await Auction.find({
        status: "UPCOMING",
        startTime: { $lte: now },
        endTime: { $gt: now },
        "registrations.0": { $exists: true }
      });

      for (const auction of toLive) {
        auction.status = "LIVE";
        await auction.save();
        await invalidateAuctionCaches(auction._id);

        await createAuctionLog({
          auctionId: auction._id,
          userName: "System",
          type: "AUCTION_STARTED",
          details: {
            message: "Auction moved to LIVE status"
          }
        });

        if (io) {
          io.to(`auction:${auction._id}`).emit("auction-started", {
            auctionId: auction._id,
            status: "LIVE",
            message: "Auction is now LIVE. Manual and auto bids are open.",
            timestamp: new Date(),
          });
        }

        // Trigger autobid immediately when auction starts.
        await handleAutoBids(auction._id, io);
      }

      // Cancel upcoming auctions whose registration window ended with zero registrations.
      const toCancel = await Auction.find({
        status: "UPCOMING",
        startTime: { $lte: now },
        registrations: { $size: 0 }
      });

      for (const auction of toCancel) {
        auction.status = "CANCELLED";
        await auction.save();
        await invalidateAuctionCaches(auction._id);

        await createAuctionLog({
          auctionId: auction._id,
          userName: "System",
          type: "AUCTION_CANCELLED",
          details: {
            reason: "No registrations before auction start time"
          }
        });
      }

      // Find all live auctions that have ended
      const endedAuctions = await Auction.find({
        status: "LIVE",
        endTime: { $lte: now }
      });

      for (const auction of endedAuctions) {
        // Mark auction as completed only when it has bids/winner.
        auction.status = "COMPLETED";

        // Declare winner if there's a current winner
        if (auction.currentWinner) {
          auction.auctionWinner = auction.currentWinner;
          auction.finalPrice = auction.currentBid;

          const winner = await User.findById(auction.currentWinner);

          // Save auction
          await auction.save();
          await invalidateAuctionCaches(auction._id);

          // Create log
          await createAuctionLog({
            auctionId: auction._id,
            userId: auction.currentWinner,
            userName: getDisplayName(winner),
            type: "AUCTION_ENDED",
            details: {
              winner: getDisplayName(winner),
              finalPrice: auction.currentBid,
              totalBids: auction.totalBids
            }
          });

          // Send winner notification
          try {
            // await SendAuctionEndedEmail(
            //   winner.email,
            //   auction.title,
            //   auction.currentBid,
            //   auction._id
            // );
          } catch (emailErr) {
            console.error("Error sending auction ended email:", emailErr);
          }

          // Emit auction ended event to all connected users
          if (io) {
            io.to(`auction:${auction._id}`).emit("auction-ended", {
              auctionId: auction._id,
              winnerId: auction.currentWinner,
              winnerName: getDisplayName(winner),
              finalPrice: auction.currentBid,
              message: `Auction ended! Winner is ${getDisplayName(winner)} with bid ₹${auction.currentBid}`,
              timestamp: new Date()
            });
          }
        } else {
          // No bids placed after going live: cancel the auction.
          auction.status = "CANCELLED";
          await auction.save();
          await invalidateAuctionCaches(auction._id);

          // Create log
          await createAuctionLog({
            auctionId: auction._id,
            userName: "System",
            type: "AUCTION_CANCELLED",
            details: {
              message: "Auction cancelled after going live without any bids",
              totalBids: auction.totalBids
            }
          });

          // Notify seller
          const seller = await User.findById(auction.createdBy);
          try {
            // Send email to seller about no bids
            // You can implement this method in email.sender.js
          } catch (emailErr) {
            console.error("Error sending seller notification:", emailErr);
          }

          // Emit event
          if (io) {
            io.to(`auction:${auction._id}`).emit("auction-ended", {
              auctionId: auction._id,
              winnerId: null,
              winnerName: null,
              finalPrice: null,
              message: "Auction cancelled because no bids were placed",
              timestamp: new Date()
            });
          }
        }
      }

      if (endedAuctions.length > 0 || toCancel.length > 0 || toLive.length > 0) {
        console.log(`Processed live starts: ${toLive.length}, ended auctions: ${endedAuctions.length}, cancelled auctions: ${toCancel.length}`);
      }
    } catch (error) {
      console.error("Error in auction completion job:", error);
    }
  });

  console.log("Auction completion job started");
};