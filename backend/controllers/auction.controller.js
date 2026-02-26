import Auction from "../models/auction.model.js";
import User from "../models/user.model.js"
import Payment from "../models/payment.model.js";
import { catchErrors } from "../utils/catchErrors.js";
import { pushAdminNotification } from "../services/notification.service.js";
import { createAuctionLog } from "../services/log.service.js";

// create auction
export const handleCreateAuction = catchErrors(async (req, res) => {
    
    // find user
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json({ success: false, message: "User not found" });
    }
    
    // take data from body
    const {
        title,
        product,
        startingPrice,
        minIncrement,   
        buyItNow,
        startTime,
        endTime,
        registrationsStartTime
    } = req.body;

    const status = "UPCOMING";
    const start = new Date(startTime);
    const end = new Date(endTime);
    const regOpenTime = new Date(registrationsStartTime);

    // create auction
    const auction = await Auction.create({
        title: String(title).trim(),
        product: product._id,
        createdBy: userId,
        status,
        isVerified: false,
        startingPrice: Number(startingPrice),
        minIncrement: Number(minIncrement),
        buyItNow,
        currentBid: 0,
        startTime: start,
        endTime: end,
        registrationsStartTime: regOpenTime,
        registrations: [],
        totalBids: 0,
    });
        
    // push admin notification
    await pushAdminNotification({
        auctionId: auction._id,
        userId: userId,
        type: "AUCTION_VERIFICATION",
        message: `New auction created by ${user.name} - ${auction.title}`,
    });

    // logs
    await createAuctionLog({
        auctionId: auction._id,
        userId: userId,
        userName: user.name,
        type: "AUCTION_CREATED",
        details: {
            auction: auction
        }
    });

    return res.status(201).json({
        success: true,
        message: "Auction created successfully",
        auction,
    }); 

});

// edit auction
// only before registration starts
export const handleEditAuction = catchErrors(async (req, res) => {
    
    // take data from req
    const { auctionId } = req.params;
    const userId = req.user._id;
    const updates = req.validUpdates;

    // find auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    // only auction creator can edit
    if (auction.createdBy.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized to edit this auction" });
    }

    // update auction
    const updatedAuction = await Auction.findByIdAndUpdate(
        auctionId,
        { ...updates, updatedAt: new Date() },
        { new: true }
    );

    updatedAuction.isVerified = false; // after edit, auction need to be verified again
    await updatedAuction.save();

    // push admin notification
    const user = await User.findById(userId);
    await pushAdminNotification({
        auctionId: auction._id,
        userId: userId,
        type: "AUCTION_VERIFICATION",
        message: `Auction edited by ${user.name} - ${auction.title}`,
    });

    // logs
    await createAuctionLog({
        auctionId: auction._id,
        userId: userId,
        userName: user.name,
        type: "AUCTION_EDITED",
        details: {
            auction: auction
        }
    }); 

    res.status(200).json({ success: true, auction: updatedAuction });
});

// delete auction only before registration starts 
// it's not actually delete, just change the status to cancelled
export const handleDeleteAuction = catchErrors(async (req, res) => {
  
    // take data from req
    const { auctionId } = req.params;
    const userId = req.user._id;
    // find auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    // only auction creator can delete
    if (auction.createdBy.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized to delete this auction" });
    }

    // delete auction is only allowed before registration starts
    if (new Date() >= auction.registrationsStartTime) {
        return res.status(400).json({ success: false, message: "Cannot delete auction after registration has started" });
    }

    // delete - not actually 
    await Auction.findByIdAndUpdate(
        auctionId,
        { $set: { status: "CANCELLED" } },
    );

    // logs 
    const user = await User.findById(userId);
    await createAuctionLog({
        auctionId: auction._id,
        userId: userId,
        userName: user.name,
        type: "AUCTION_CANCELLED"
    });

    res.status(200).json({ success: true });
});

/**
 * Registration starts at registrationsStartTime,
 * and ends at auction start time.
 * 
 * user click on register -> bidvault/auctions/:auctionId/register
 *        
 *        email: .........
 *            
 *            |pay| <- click (Razorpay QR code -> payment gateway -> success)
 * 
 * After successful payment, user registered in the auction.
 */
export const handleRegisterInAuction = catchErrors(async (req, res) => {
    
    // take data from req
    const { email } = req.body;
    const { auctionId } = req.params;
    const userId = req.user._id;

    // find auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(400).json({ success: false, message: "Auction not found" });
    } 
    // find user
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ success: false, message: "User not found" });
    }
    
    if (user._id.toString() === auction.createdBy.toString()) {
        return res.status(400).json({ success: false, message: "You are seller, you cannot register in your own auction" });
    }

    // registration is only allowed between registrationsStartTime and auction start time
    const now = new Date(); 
    if (now < auction.registrationsStartTime) {
        return res.status(400).json({ success: false, message: "Registration has not started yet" });
    }
    if (now > auction.auctionStartTime) {
        return res.status(400).json({ success: false, message: "Registration has ended" });
    }

    // check if user is already registered
    if (auction.registrations.includes(user._id)) {
        return res.status(400).json({ success: false, message: "User already registered in this auction" });
    }

    // payment logic here (integrate with Razorpay or any other payment gateway)
    // payment object for track
    await Payment.create({
        userId,
        auctionId,
        amount: (0.1 * auction.startingPrice), // registration fees is 10% of starting price
        status: "PENDING",
        type: "REGISTRATION_FEES",
    })
    // after successful payment, register user in auction
    auction.registrations.push(user._id);
    await auction.save();

    // logs
    await createAuctionLog({
        auctionId: auction._id,
        userId: userId,
        userName: user.name,
        type: "USER_REGISTRATION",
    });

    return res.json({ success: true, message: "User registered in the auction successfully" });
});

/**
 * After auction ends, winner need to pay the amount.
 * 
 * Only winner can pay -> bidvault/auctions/:auctionId/pay
 * 
 *          Razorpay integration -> payment gateway -> success
 * 
 * assuming payment is successful, then update auction status to "COMPLETED"
 * and save payment details in Payment collection for track.
 */
export const handlePayment = catchErrors(async (req, res) => {

    // take data from req
    const { auctionId } = req.params;
    const userId = req.user._id;

    // find auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(400).json({ success: false, message: "Auction not found" });
    }

    // only winner can pay
    if (auction.winner.toString() !== userId.toString()) {
        return res.status(401).json({ success: false, message: "Unauthorized to pay for this auction" });
    }

    // payment logic here (integrate with Razorpay or any other payment gateway)
    // payment object for track
    
    // after successful payment, update auction
    auction.finalPrice = auction.currentBid;
    auction.auctionWinner = auction.currentWinner;
    auction.currentBid = null;
    auction.currentWinner = null;
    auction.status = "COMPLETED";
    await auction.save();

    await Payment.create({
        userId,
        auctionId,
        amount: auction.finalPrice,
        status: "PENDING",
        type: "WINNING_PAYMENT",
    })

    // push admin notification
    const user = await User.findById(userId);
    await pushAdminNotification({
        auctionId: auction._id,
        userId: userId,
        type: "PAYMENT_VERIFICATION",
        message: `Payment made by ${user.name} for auction - ${auction.title}`,
    });

    // logs
    await createAuctionLog({
        auctionId: auction._id,
        userId: userId,
        userName: user.name,
        type: "AUCTION_PAYED",
        details: {
            Amount: auction.finalPrice
        }
    });

    return res.json({ success: true, message: "Payment successful, auction completed" });
});

// get list of auctions with status filter
// only latest 20 auctions
export const listAuctions = catchErrors(async (req, res) => {
    
    // take status from query
    const { status } = req.query;
    const result = await Auction.find({ status }).sort({ createdAt: -1 }).limit(20);
    
    res.status(200).json({ success: true, result });
});

// get particular auction details
export const getAuction = catchErrors(async (req, res) => {
  
    const { auctionId } = req.params;
    const auction = await Auction.findOne({ auctionId });
    
    res.status(200).json({ success: true, auction });
});