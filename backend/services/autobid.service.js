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
    const lockKey = `auction-bid-lock:${auctionId}`;

    const bidStepDelayMs = Math.max(
        0,
        Number(
            options.bidStepDelayMs ??
            process.env.AUTOBID_STEP_DELAY_MS ??
            1000
        ) || 0
    );

    try {
        let cycleGuard = 0;

        while (cycleGuard < 100) {
            cycleGuard += 1;

            let lock = null;
            let bidPlacedThisCycle = false;

            try {
                // 1. Acquire lock for ONE bid operation
                lock = await acquireDistributedLock(
                    lockKey,
                    5000,
                    5000,
                    50
                );

                // 2. Fetch latest auction INSIDE the lock
                const auction = await Auction.findById(auctionId);

                if (!auction || auction.status !== "LIVE") {
                    break;
                }

                let currentBid = Math.max(
                    auction.currentBid,
                    auction.startingPrice
                );

                const minIncrement = auction.minIncrement;

                const autoBidders = await AutoBid.find({
                    auctionId,
                    isActive: true
                })
                    .sort({ maxLimit: -1, createdAt: 1 })
                    .select(
                        "userId maxLimit isActive lastBidAmount totalAutoBidsPlaced lastTriggeredAt"
                    );

                if (!autoBidders.length) {
                    break;
                }

                for (const autobid of autoBidders) {
                    const bidderId = autobid.userId;
                    const previousWinnerId = auction.currentWinner;

                    // Already winning
                    if (
                        String(bidderId) ===
                        String(auction.currentWinner)
                    ) {
                        continue;
                    }

                    const user = await User.findById(bidderId);

                    if (!user) {
                        continue;
                    }

                    const nextBid = currentBid + minIncrement;

                    // Maximum limit reached
                    if (nextBid > autobid.maxLimit) {
                        autobid.isActive = false;
                        await autobid.save();
                        continue;
                    }

                    // Place bid
                    let bid = await Bid.findOne({
                        auctionId,
                        userId: bidderId
                    });

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

                    // Update AutoBid
                    autobid.lastBidAmount = nextBid;
                    autobid.lastTriggeredAt = new Date();
                    autobid.totalAutoBidsPlaced += 1;
                    await autobid.save();

                    // Update auction
                    auction.currentBid = nextBid;
                    auction.currentWinner = bidderId;
                    auction.totalBids += 1;

                    await auction.save();

                    // Log
                    await createAuctionLog({
                        auctionId,
                        userId: bidderId,
                        userName: getDisplayName(user),
                        type: "AUTO_BID_TRIGGERED",
                        details: {
                            bidAmount: nextBid
                        }
                    });

                    // Socket events
                    if (io) {
                        io.to(`auction:${auctionId}`).emit(
                            "bid-update",
                            {
                                auctionId,
                                currentBid: auction.currentBid,
                                currentWinner: user._id,
                                winnerName: getDisplayName(user),
                                totalBids: auction.totalBids,
                                timestamp: new Date()
                            }
                        );

                        const lb =
                            await buildAuctionLeaderboard(auctionId);

                        io.to(`auction:${auctionId}`).emit(
                            "leaderboard-update",
                            {
                                auctionId,
                                leaderboard: lb.leaderboard,
                                timestamp: new Date()
                            }
                        );
                    }

                    await invalidateAuctionMutationCaches({
                        auctionId,
                        previousStatus: "LIVE",
                        nextStatus: auction.status,
                        creatorId: auction.createdBy,
                        affectedUserIds: [
                            bidderId,
                            previousWinnerId
                        ]
                    });

                    bidPlacedThisCycle = true;

                    // Only ONE bid while holding the lock
                    break;
                }

            } finally {
                // 3. Release lock immediately
                await releaseDistributedLock(lock);
            }

            // Nothing else can bid
            if (!bidPlacedThisCycle) {
                break;
            }

            // 4. Wait OUTSIDE the lock
            if (bidStepDelayMs > 0) {
                await delay(bidStepDelayMs);
            }
        }

    } catch (error) {
        console.error("Error handling auto-bids:", error);
    }
};