import { catchErrors } from "../utils/catchErrors.js";
import AutoBid from "../models/autobid.model.js";
import Auction from "../models/auction.model.js";
import Bid from "../models/bid.model.js";
import User from "../models/user.model.js";
import { handleAutoBids } from "../services/autobid.service.js";
import { createAuctionLog } from "../services/log.service.js";
import { placeBidWithLock, validateBidLogic } from "../services/bidding.service.js";
import { buildAuctionLeaderboard, getDisplayName } from "../services/leaderboard.service.js";
import { invalidateAuctionMutationCaches } from "../services/cache-invalidation.service.js";

// Check autobid and user helper
const checkAutobidAndUser = async (autobidId, userId, res) => {
    const autobid = await AutoBid.findById(autobidId);
    if (!autobid) {
        return res.status(404).json({
            success: false,
            message: "Auto-bid not found"
        });
    }

    if (String(autobid.userId) !== String(userId)) {
        return res.status(403).json({
            success: false,
            message: "You are not authorized to modify this auto-bid"
        });
    }

    return autobid;
};

const emitLeaderboard = async (io, auctionId) => {
    if (!io) return;
    const lb = await buildAuctionLeaderboard(auctionId);
    io.to(`auction:${auctionId}`).emit("leaderboard-update", {
        auctionId,
        leaderboard: lb.leaderboard,
        timestamp: new Date()
    });
};

export const handleGetMyAutobid = catchErrors(async (req, res) => {
    const { auctionId } = req.params;
    const userId = req.user._id;

    const autobid = await AutoBid.findOne({ auctionId, userId });

    return res.status(200).json({
        success: true,
        data: {
            autobid: autobid || null
        }
    });
});

// Place manual bid with Redis locking
export const handlePlaceBid = catchErrors(async (req, res) => {
    const { bidAmount } = req.body;
    const userId = req.user._id;
    const { auctionId } = req.params;
    const io = req.app.locals.io;

    try {
        // Validate bid logic
        await validateBidLogic(auctionId, userId, bidAmount);

        // Place bid with lock
        const result = await placeBidWithLock(auctionId, userId, bidAmount, io);

        // Emit real-time bid update
        if (io) {
            const user = await User.findById(userId);
            io.to(`auction:${auctionId}`).emit("bid-update", {
                auctionId,
                currentBid: result.auction.currentBid,
                currentWinner: userId,
                winnerName: getDisplayName(user),
                totalBids: result.auction.totalBids,
                timestamp: new Date()
            });
        }

        // After manual bid, trigger auto-bids (other bidders might respond)
        await handleAutoBids(auctionId, io);
        await emitLeaderboard(io, auctionId);

        return res.status(200).json({
            success: true,
            message: `Your bid of ₹${bidAmount} has been placed successfully`,
            data: {
                bidAmount: result.bid.amount,
                currentBid: result.auction.currentBid,
                totalBids: result.auction.totalBids
            }
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to place bid"
        });
    }
});

// Set autobid
export const handleSetAutobid = catchErrors(async (req, res) => {
    const { auctionId } = req.params;
    const { maxLimit } = req.body;
    const userId = req.user._id;
    const io = req.app.locals.io;

    // Check if autobid already exists
    const existingAutoBid = await AutoBid.findOne({ auctionId, userId });
    if (existingAutoBid) {
        return res.status(400).json({
            success: false,
            message: "Auto-bid already set for this auction"
        });
    }

    // Create new auto-bid
    const autobid = await AutoBid.create({
        auctionId,
        userId,
        maxLimit,
        isActive: true
    });

    // Add user to auction's autoBidders list
    const auction = await Auction.findById(auctionId);
    if (!auction.autoBidders.includes(userId)) {
        auction.autoBidders.push(userId);
        await auction.save();
    }

    await invalidateAuctionMutationCaches({
        auctionId,
        previousStatus: auction.status,
        nextStatus: auction.status,
        creatorId: auction.createdBy,
        affectedUserIds: [userId],
    });

    // Create log
    const user = await User.findById(userId);
    await createAuctionLog({
        auctionId,
        userId,
        userName: getDisplayName(user),
        type: "AUTO_BID_SET",
        details: { maxLimit }
    });

    // Trigger auto-bids
    await handleAutoBids(auctionId, io);
    await emitLeaderboard(io, auctionId);

    return res.status(200).json({
        success: true,
        message: "Auto-bid set successfully",
        data: { autobid }
    });
});

// Edit autobid
export const handleEditAutobid = catchErrors(async (req, res) => {
    const { auctionId } = req.params;
    const { autobidId } = req.params;
    const { maxLimit } = req.body;
    const userId = req.user._id;
    const io = req.app.locals.io;

    // Check autobid ownership
    const autobid = await AutoBid.findById(autobidId);
    if (!autobid) {
        return res.status(404).json({
            success: false,
            message: "Auto-bid not found"
        });
    }

    if (String(autobid.userId) !== String(userId)) {
        return res.status(403).json({
            success: false,
            message: "You are not authorized to modify this auto-bid"
        });
    }

    if (String(autobid.auctionId) !== String(auctionId)) {
        return res.status(400).json({
            success: false,
            message: "Auto-bid does not belong to this auction"
        });
    }

    // Update max limit
    autobid.maxLimit = maxLimit;
    await autobid.save();

    const auction = await Auction.findById(autobid.auctionId).select("createdBy status");
    await invalidateAuctionMutationCaches({
        auctionId: autobid.auctionId,
        previousStatus: auction?.status,
        nextStatus: auction?.status,
        creatorId: auction?.createdBy,
        affectedUserIds: [userId],
    });

    // Create log
    const user = await User.findById(userId);
    await createAuctionLog({
        auctionId: autobid.auctionId,
        userId,
        userName: getDisplayName(user),
        type: "AUTO_BID_EDITED",
        details: { maxLimit }
    });

    // Trigger auto-bids
    await handleAutoBids(autobid.auctionId, io);
    await emitLeaderboard(io, autobid.auctionId);

    return res.status(200).json({
        success: true,
        message: "Auto-bid updated successfully",
        data: { autobid }
    });
});

// Deactivate autobid
export const handleDeactivateAutobid = catchErrors(async (req, res) => {
    const { auctionId } = req.params;
    const { autobidId } = req.params;
    const userId = req.user._id;

    // Check autobid ownership
    const autobid = await AutoBid.findById(autobidId);
    if (!autobid) {
        return res.status(404).json({
            success: false,
            message: "Auto-bid not found"
        });
    }

    if (String(autobid.userId) !== String(userId)) {
        return res.status(403).json({
            success: false,
            message: "You are not authorized to modify this auto-bid"
        });
    }

    if (String(autobid.auctionId) !== String(auctionId)) {
        return res.status(400).json({
            success: false,
            message: "Auto-bid does not belong to this auction"
        });
    }

    // Deactivate
    autobid.isActive = false;
    await autobid.save();

    const auction = await Auction.findById(autobid.auctionId).select("createdBy status");
    await invalidateAuctionMutationCaches({
        auctionId: autobid.auctionId,
        previousStatus: auction?.status,
        nextStatus: auction?.status,
        creatorId: auction?.createdBy,
        affectedUserIds: [userId],
    });

    // Create log
    const user = await User.findById(userId);
    await createAuctionLog({
        auctionId: autobid.auctionId,
        userId,
        userName: getDisplayName(user),
        type: "AUTO_BID_DEACTIVATED"
    });

    await emitLeaderboard(req.app.locals.io, autobid.auctionId);

    return res.status(200).json({
        success: true,
        message: "Auto-bid deactivated successfully",
        data: { autobid }
    });
});

// Activate autobid
export const handleActivateAutobid = catchErrors(async (req, res) => {
    const { auctionId } = req.params;
    const { autobidId } = req.params;
    const userId = req.user._id;
    const io = req.app.locals.io;

    // Check autobid ownership
    const autobid = await AutoBid.findById(autobidId);
    if (!autobid) {
        return res.status(404).json({
            success: false,
            message: "Auto-bid not found"
        });
    }

    if (String(autobid.userId) !== String(userId)) {
        return res.status(403).json({
            success: false,
            message: "You are not authorized to modify this auto-bid"
        });
    }

    if (String(autobid.auctionId) !== String(auctionId)) {
        return res.status(400).json({
            success: false,
            message: "Auto-bid does not belong to this auction"
        });
    }

    // Activate
    autobid.isActive = true;
    await autobid.save();

    const auction = await Auction.findById(autobid.auctionId).select("createdBy status");
    await invalidateAuctionMutationCaches({
        auctionId: autobid.auctionId,
        previousStatus: auction?.status,
        nextStatus: auction?.status,
        creatorId: auction?.createdBy,
        affectedUserIds: [userId],
    });

    // Create log
    const user = await User.findById(userId);
    await createAuctionLog({
        auctionId: autobid.auctionId,
        userId,
        userName: getDisplayName(user),
        type: "AUTO_BID_ACTIVATED",
        details: { maxLimit: autobid.maxLimit }
    });

    // Trigger auto-bids
    await handleAutoBids(autobid.auctionId, io);
    await emitLeaderboard(io, autobid.auctionId);

    return res.status(200).json({
        success: true,
        message: "Auto-bid activated successfully",
        data: { autobid }
    });
});