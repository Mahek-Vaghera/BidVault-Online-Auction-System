import { catchErrors } from "../utils/catchErrors.js";
import User from "../models/user.model.js";
import Auction from "../models/auction.model.js";

export const validateBid = catchErrors(async (req, res, next) => {

    // take data from req
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json({ success: false, message: "User not found" });
    }
    const { auctionId } = req.params;
    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    // check if user registered for the auction or not
    const isRegistered = auction.registrations.some(registration => registration.toString() === userId.toString());
    if (!isRegistered) {
        return res.status(403).json({ success: false, message: "You are not registered for this auction" });
    }

    // validate bid amount
    const { bidAmount } = req.body;
    if (typeof bidAmount !== "number" || isNaN(bidAmount) || bidAmount <= 0) {
        return res.status(400).json({ success: false, message: "Bid amount must be a positive number" });
    }
    const minRequired = auction.currentBid > 0
        ? auction.currentBid + auction.minIncrement
        : auction.startingPrice;
    if (bidAmount < minRequired) {
        return res.status(400).json({ success: false, message: `Bid amount must be at least ₹${minRequired}` });
    }

    next();
});

export const validateAutobid = catchErrors(async (req, res, next) => {

    // take data from req
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json({ success: false, message: "User not found" });
    }
    const { auctionId } = req.params;
    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    // check if user registered for the auction or not
    const isRegistered = auction.registrations.some(registration => registration.toString() === userId.toString());
    if (!isRegistered) {
        return res.status(403).json({ success: false, message: "You are not registered for this auction" });
    }

    // validate max limit
    const { maxLimit } = req.body;
    if (typeof maxLimit !== "number" || isNaN(maxLimit) || maxLimit <= 0) {
        return res.status(400).json({ success: false, message: "Max limit must be a positive number" });
    }
    const minRequired = auction.currentBid > 0
        ? auction.currentBid + auction.minIncrement
        : auction.startingPrice;
    if (maxLimit < minRequired) {
        return res.status(400).json({ success: false, message: `Max limit must be at least ₹${minRequired}` });
    }

    next();
});