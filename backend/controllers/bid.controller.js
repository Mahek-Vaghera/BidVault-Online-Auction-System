import { catchErrors } from "../utils/catchErrors.js";
import AutoBid from "../models/autobid.model.js";
import Auction from "../models/auction.model.js";
import Bid from "../models/bid.model.js";
import { handleAutoBids } from "../services/autobid.service.js";

// create a private function to check autobid and user 
const checkAutobidAndUser = catchErrors(async (autobidId, userId) => {
    // find autobid
    const autobid = await AutoBid.findById(autobidId);
    if (!autobid) {
        return res.status(404).json({
            success: false,
            message: "Auto-bid not found"
        });
    }

    // check if autobid belongs to the user
    if (String(autobid.userId) !== String(userId)) {
        return res.status(403).json({
            success: false,
            message: "You are not authorized to activate this auto-bid"
        });
    }

    return autobid;
});

// place bid
export const handlePlaceBid = catchErrors(async (req, res) => {

    // take data from req
    const { bidAmount } = req.body;
    const userId = req.user.id;
    const { auctionId } = req.params;

    // manual bidding should not allowed if user has active autobid for the auction
    const autobid = await AutoBid.findOne({ auctionId, user: userId, isActive: true });
    if (autobid) {
        return res.status(400).json({
            success: false,
            message: "You have an active auto-bid for this auction. Please deactivate it to place a manual bid."
        });
    }

    // find bid 
    const existingBid = await Bid.findOne({ auction: auctionId, user: userId });

    // if bid exists, update it
    if (existingBid) {
        // store old bid-amount
        existingBid.oldBidAmounts.push(existingBid.amount);

        // update
        existingBid.amount = bidAmount;
        await existingBid.save();
    }
    // if no bid, create new one
    else {
        const newBid = new Bid({
            auction: auctionId,
            user: userId,
            amount: bidAmount
        });
        await newBid.save();
    }
});

// set autobid 
export const handleSetAutobid = catchErrors(async (req, res) => {

    // take data from req
    const { auctionId } = req.params;
    const { maxLimit } = req.body;
    const userId = req.user._id;
        
    // check if autobid already set for this auction by the user
    const existingAutoBid = await AutoBid.findOne({ auctionId, userId });
    if (existingAutoBid) {
        return res.status(400).json({
        success: false,
        message: "Auto-bid already set for this auction" });
    }

    await AutoBid.create({
        auctionId: auctionId,
        userId: userId,
        maxLimit: maxLimit,
    });
    
    // add user in autobidders list of auction
    const auction = await Auction.findById(auctionId);
    auction.autoBidders.push(userId);
    await auction.save();

    handleAutoBids(auctionId);

    return res.status(200).json("Your auto-bid has been set successfully");
});

// edit autobid
export const handleEditAutobid = catchErrors(async (req, res) => {

    // take data from req
    const { autobidId } = req.params;
    const { maxLimit } = req.body;
    const userId = req.user._id;

    // check autobid and user
    const autobid = checkAutobidAndUser(autobidId, userId);

    // update max limit
    autobid.maxLimit = maxLimit;
    await autobid.save();
    handleAutoBids(autobid.auctionId);

    return res.status(200).json("Your auto-bid has been updated successfully");
});

// deactivate autobid
export const handleDeactivateAutobid = catchErrors(async (req, res) => {
    
    // take data from req
    const { autobidId } = req.params;
    const userId = req.user._id;

    // check autobid and user
    const autobid = checkAutobidAndUser(autobidId, userId);;

    // deactivate autobid
    autobid.isActive = false;
    await autobid.save();

    return res.status(200).json("Your auto-bid has been deactivated successfully");
});

//activate autobid
export const handleActivateAutobid = catchErrors(async (req, res) => {

    // take data from req
    const { autobidId } = req.params;
    const userId = req.user._id;

    // check autobid and user
    const autobid = checkAutobidAndUser(autobidId, userId);;

    // activate autobid
    autobid.isActive = true;
    await autobid.save();
    handleAutoBids(autobid.auctionId);

    return res.status(200).json("Your auto-bid has been activated successfully");
});