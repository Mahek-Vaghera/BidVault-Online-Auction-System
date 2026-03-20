import Auction from "../models/auction.model.js";
import User from "../models/user.model.js"
import Payment from "../models/payment.model.js";
import Delivery from "../models/delivery.model.js";
import Product from "../models/product.model.js";
import { catchErrors } from "../utils/catchErrors.js";
import { pushAdminNotification } from "../services/notification.service.js";
import { createAuctionLog } from "../services/log.service.js";
import {
  createRegistrationOrder,
  createWinningPaymentOrder,
  verifyPaymentSignature,
  updatePaymentRecord,
} from "../services/razorpay.service.js";
import { getDisplayName } from "../services/leaderboard.service.js";
import { cacheSetJson, cacheGetJson } from "../services/cache.service.js";
import { getAuctionListCacheTtlSeconds } from "../services/cache-ttl.service.js";
import {
    invalidateAdminCacheGroups,
    invalidateAuctionMutationCaches,
    invalidateProfileCachesForUser,
} from "../services/cache-invalidation.service.js";

const hasCompleteAddress = (user) => {
    if (!user?.address) return false;
    const requiredFields = ["line1", "city", "state", "pincode", "country", "phone"];
    return requiredFields.every((field) => String(user.address[field] || "").trim() !== "");
};

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
        message: `New auction created by ${user.fullname || user.username} - ${auction.title}`,
    });

    // logs
    await createAuctionLog({
        auctionId: auction._id,
        userId: userId,
        userName: user.fullname || user.username,
        type: "AUCTION_CREATED",
        details: {
            auction: auction
        }
    });

    await invalidateAuctionMutationCaches({
        auctionId: auction._id,
        nextStatus: auction.status,
        creatorId: userId,
        clearSavedAuctions: true,
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
    const updates = req.body;

    // find auction
    const auction = await Auction.findById(auctionId);
        const previousStatus = auction.status;

    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    // only auction creator can edit
    if (auction.createdBy.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized to edit this auction" });
    }

    const fullAllowedFields = [
        "title",
        "startingPrice",
        "minIncrement",
        "buyItNow",
        "registrationsStartTime",
        "startTime",
        "endTime",
        "product.name",
        "product.category",
        "product.condition",
        "product.description",
        "product.images",
    ];
    const limitedAllowedFields = ["registrationsStartTime", "startTime", "endTime", "product.description"];
    const allowedFields = auction.isVerified ? limitedAllowedFields : fullAllowedFields;
    const disallowedUpdates = Object.keys(updates).filter((key) => !allowedFields.includes(key));
    if (disallowedUpdates.length > 0) {
        return res.status(400).json({
            success: false,
            message: auction.isVerified
                ? "After verification, only registrations start time, auction start time, auction end time, and description can be edited"
                : "Invalid fields in edit payload",
        });
    }

    const auctionUpdates = { ...updates, updatedAt: new Date() };
    const productUpdates = {};

    if (Object.prototype.hasOwnProperty.call(auctionUpdates, "product.description")) {
        productUpdates.description = auctionUpdates["product.description"];
        delete auctionUpdates["product.description"];
    }

    if (Object.prototype.hasOwnProperty.call(auctionUpdates, "product.name")) {
        productUpdates.name = auctionUpdates["product.name"];
        delete auctionUpdates["product.name"];
    }

    if (Object.prototype.hasOwnProperty.call(auctionUpdates, "product.category")) {
        productUpdates.category = auctionUpdates["product.category"];
        delete auctionUpdates["product.category"];
    }

    if (Object.prototype.hasOwnProperty.call(auctionUpdates, "product.condition")) {
        productUpdates.condition = auctionUpdates["product.condition"];
        delete auctionUpdates["product.condition"];
    }

    if (Object.prototype.hasOwnProperty.call(auctionUpdates, "product.images")) {
        productUpdates.images = auctionUpdates["product.images"];
        delete auctionUpdates["product.images"];
    }

    // update auction core fields
    const updatedAuction = await Auction.findByIdAndUpdate(auctionId, auctionUpdates, { new: true })
        .populate('product')
        .populate('createdBy', 'username fullname email')
        .populate('currentWinner', 'username fullname email')
        .populate('auctionWinner', 'username fullname email');

    // update referenced product if needed
    if (Object.keys(productUpdates).length > 0 && auction.product) {
        await Product.findByIdAndUpdate(auction.product, productUpdates, { new: true });
    }

    await updatedAuction.save();

    // push admin notification
    const user = await User.findById(userId);
    await pushAdminNotification({
        auctionId: auction._id,
        userId: userId,
        type: "AUCTION_VERIFICATION",
        message: `Auction edited by ${user.fullname || user.username} - ${auction.title}`,
    });

    // logs
    await createAuctionLog({
        auctionId: auction._id,
        userId: userId,
        userName: user.fullname || user.username,
        type: "AUCTION_EDITED",
        details: {
            auction: auction
        }
    }); 

    await invalidateAuctionMutationCaches({
        auctionId: auction._id,
        previousStatus,
        nextStatus: updatedAuction.status,
        creatorId: userId,
        clearSavedAuctions: true,
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
        const previousStatus = auction.status;

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
        userName: user.fullname || user.username,
        type: "AUCTION_CANCELLED"
    });

    await invalidateAuctionMutationCaches({
        auctionId: auction._id,
        previousStatus,
        nextStatus: "CANCELLED",
        creatorId: userId,
        clearSavedAuctions: true,
    });

    res.status(200).json({ success: true });
});

/**
 * Registration starts at registrationsStartTime,
 * and ends at auction start time.
 * 
 * Step 1: user click on register -> creates Razorpay order
 * Step 2: user makes payment via Razorpay gateway
 * Step 3: user verifies payment -> registers in auction
 */
export const handleRegisterInAuction = catchErrors(async (req, res) => {
    
    // take data from req
    const { auctionId } = req.params;
    const userId = req.user._id;

    // find auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(400).json({ success: false, message: "Auction not found" });
    } 
    
    // find user
    const user = await User.findById(userId);
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
    if (now > auction.startTime) {
        return res.status(400).json({ success: false, message: "Registration has ended" });
    }

    // check if user is already registered
    if (auction.registrations.some((id) => id.toString() === user._id.toString())) {
        return res.status(400).json({ success: false, message: "User already registered in this auction" });
    }

    // Calculate registration fee (10% of starting price)
    const registrationFee = 0.1 * auction.startingPrice;

    try {
        // Create Razorpay order
        const razorpayOrder = await createRegistrationOrder(auctionId, registrationFee, userId);
        
        // Create payment record in database
        const paymentRecord = await Payment.create({
            userId,
            auctionId,
            amount: registrationFee,
            status: "PENDING",
            type: "REGISTRATION_FEES",
            metadata: {
                razorpayOrderId: razorpayOrder.orderId,
            }
        });

        await invalidateAdminCacheGroups();
        await invalidateAuctionMutationCaches({
            auctionId: auction._id,
            previousStatus: auction.status,
            nextStatus: auction.status,
            creatorId: auction.createdBy,
            affectedUserIds: [userId],
        });

        return res.status(200).json({
            success: true,
            message: "Payment order created successfully",
            paymentOrder: razorpayOrder,
            paymentId: paymentRecord._id,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to create payment order"
        });
    }
});

/**
 * Verify registration payment
 * This endpoint is called after successful payment on frontend
 */
export const handleVerifyRegistrationPayment = catchErrors(async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId, auctionId } = req.body;
    const userId = req.user._id;

    // Verify Razorpay signature
    const isSignatureValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    
    if (!isSignatureValid) {
        return res.status(400).json({
            success: false,
            message: "Invalid payment signature"
        });
    }

    try {
        // Find auction and user
        const auction = await Auction.findById(auctionId);
        const user = await User.findById(userId);

        if (!auction || !user) {
            return res.status(400).json({
                success: false,
                message: "Auction or user not found"
            });
        }

        // Register user in auction
        if (!auction.registrations.includes(user._id)) {
            auction.registrations.push(user._id);
            await auction.save();
        }

        // Update payment record
        await updatePaymentRecord(paymentId, "SUCCESS", razorpayPaymentId);

        // Create log
        await createAuctionLog({
            auctionId: auction._id,
            userId: userId,
            userName: getDisplayName(user),
            type: "USER_REGISTRATION",
            details: {
                registrationFee: auction.startingPrice * 0.1,
            }
        });

        await invalidateAuctionMutationCaches({
            auctionId: auction._id,
            previousStatus: auction.status,
            nextStatus: auction.status,
            creatorId: auction.createdBy,
            affectedUserIds: [userId],
        });

        return res.status(200).json({
            success: true,
            message: "User registered in auction successfully",
            auction
        });
    } catch (error) {
        console.error("Payment verification error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to verify payment"
        });
    }
});

/**
 * After auction ends, winner needs to pay the winning amount.
 * 
 * Step 1: winner initiates payment -> creates Razorpay order
 * Step 2: winner makes payment via Razorpay gateway
 * Step 3: verify payment -> update auction as COMPLETED
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
    if (auction.auctionWinner && auction.auctionWinner.toString() !== userId.toString()) {
        return res.status(401).json({ success: false, message: "Unauthorized to pay for this auction" });
    }

    // Auction must be ended
    if (!["COMPLETED", "ENDED"].includes(auction.status)) {
        return res.status(400).json({ success: false, message: "Auction has not ended yet" });
    }

    const user = await User.findById(userId);
    if (!hasCompleteAddress(user)) {
        return res.status(400).json({
            success: false,
            message: "Please add your complete delivery address in profile before making payment",
        });
    }

    try {
        // Create Razorpay order for winning amount
        const razorpayOrder = await createWinningPaymentOrder(auctionId, auction.currentBid, userId);
        
        // Create payment record
        const paymentRecord = await Payment.create({
            userId,
            auctionId,
            amount: auction.currentBid,
            status: "PENDING",
            type: "WINNING_PAYMENT",
            metadata: {
                razorpayOrderId: razorpayOrder.orderId,
            }
        });

        await invalidateAdminCacheGroups();
        await invalidateAuctionMutationCaches({
            auctionId: auction._id,
            previousStatus: auction.status,
            nextStatus: auction.status,
            creatorId: auction.createdBy,
            affectedUserIds: [userId, auction.auctionWinner],
        });

        return res.status(200).json({
            success: true,
            message: "Payment order created successfully",
            paymentOrder: razorpayOrder,
            paymentId: paymentRecord._id,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create payment order"
        });
    }
});

/**
 * Verify winning payment
 */
export const handleVerifyWinningPayment = catchErrors(async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId, auctionId } = req.body;
    const userId = req.user._id;

    // Verify Razorpay signature
    const isSignatureValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    
    if (!isSignatureValid) {
        return res.status(400).json({
            success: false,
            message: "Invalid payment signature"
        });
    }

    try {
        // Find auction
        const auction = await Auction.findById(auctionId);

        if (!auction) {
            return res.status(400).json({
                success: false,
                message: "Auction not found"
            });
        }

        const previousStatus = auction.status;

        // Update auction as completed after successful payment verification.
        auction.finalPrice = auction.currentBid;
        auction.auctionWinner = auction.currentWinner;
        auction.status = "COMPLETED";
        await auction.save();

        // Update payment record
        const payment = await updatePaymentRecord(paymentId, "SUCCESS", razorpayPaymentId);

        // Create delivery order once payment is confirmed.
        const user = await User.findById(userId);
        const existingDelivery = await Delivery.findOne({ paymentId: payment._id });
        let delivery = existingDelivery;
        if (!delivery) {
            delivery = await Delivery.create({
                userId,
                auctionId: auction._id,
                paymentId: payment._id,
                shippingAddress: {
                    line1: user.address.line1,
                    line2: user.address.line2,
                    city: user.address.city,
                    state: user.address.state,
                    pincode: user.address.pincode,
                    country: user.address.country,
                    phone: user.address.phone,
                },
                status: "CREATED",
                timeline: [
                    {
                        status: "CREATED",
                        note: "Delivery order created after successful payment",
                    },
                ],
            });
        }

        // Create log
        await createAuctionLog({
            auctionId: auction._id,
            userId: userId,
            userName: getDisplayName(user),
            type: "AUCTION_COMPLETED",
            details: {
                winningAmount: auction.finalPrice
            }
        });

        // Push admin notification
        await pushAdminNotification({
            auctionId: auction._id,
            userId: userId,
            type: "PAYMENT_VERIFICATION",
            message: `Payment received from ${getDisplayName(user)} for auction - ${auction.title}. Amount: ₹${auction.finalPrice}`,
        });

        await invalidateAuctionMutationCaches({
            auctionId: auction._id,
            previousStatus,
            nextStatus: auction.status,
            creatorId: auction.createdBy,
            affectedUserIds: [userId, auction.auctionWinner],
            clearSavedAuctions: true,
        });

        return res.status(200).json({
            success: true,
            message: "Payment verified and auction completed",
            auction,
            payment,
            delivery,
        });
    } catch (error) {
        console.error("Payment verification error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to verify payment"
        });
    }
});

/**
 * Buy It Now payment initiation
 * Allowed only before registration starts.
 */
export const handleBuyNow = catchErrors(async (req, res) => {
    const { auctionId } = req.params;
    const userId = req.user._id;

    const auction = await Auction.findById(auctionId);

    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    if (auction.createdBy.toString() === userId.toString()) {
        return res.status(400).json({ success: false, message: "You cannot buy your own auction item" });
    }

    if (!auction.buyItNow || Number(auction.buyItNow) <= 0) {
        return res.status(400).json({ success: false, message: "Buy It Now is not available for this auction" });
    }

    if (auction.status !== "UPCOMING") {
        return res.status(400).json({ success: false, message: "Buy It Now is only available for upcoming auctions" });
    }

    const user = await User.findById(userId);
    if (!hasCompleteAddress(user)) {
        return res.status(400).json({
            success: false,
            message: "Please add your complete delivery address in profile before making payment",
        });
    }

    const now = new Date();
    if (auction.registrationsStartTime && now >= auction.registrationsStartTime) {
        return res.status(400).json({ success: false, message: "Buy It Now is closed after registration starts" });
    }

    try {
        const razorpayOrder = await createWinningPaymentOrder(auctionId, auction.buyItNow, userId);

        const paymentRecord = await Payment.create({
            userId,
            auctionId,
            amount: auction.buyItNow,
            status: "PENDING",
            type: "BUY_IT_NOW_PAYMENT",
            metadata: {
                razorpayOrderId: razorpayOrder.orderId,
            }
        });

        await invalidateAdminCacheGroups();
        await invalidateAuctionMutationCaches({
            auctionId: auction._id,
            previousStatus: auction.status,
            nextStatus: auction.status,
            creatorId: auction.createdBy,
            affectedUserIds: [userId],
        });

        return res.status(200).json({
            success: true,
            message: "Buy It Now payment order created",
            paymentOrder: razorpayOrder,
            paymentId: paymentRecord._id,
            buyItNowPrice: auction.buyItNow,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to create Buy It Now order"
        });
    }
});

export const handleVerifyBuyNowPayment = catchErrors(async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = req.body;
    const { auctionId } = req.params;
    const userId = req.user._id;

    const isSignatureValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isSignatureValid) {
        return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const previousStatus = auction.status;

    const now = new Date();
    if (auction.status !== "UPCOMING" || (auction.registrationsStartTime && now >= auction.registrationsStartTime)) {
        return res.status(400).json({ success: false, message: "Buy It Now is no longer available" });
    }

    const payment = await updatePaymentRecord(paymentId, "SUCCESS", razorpayPaymentId);

    auction.currentBid = auction.buyItNow;
    auction.finalPrice = auction.buyItNow;
    auction.currentWinner = userId;
    auction.auctionWinner = userId;
    auction.status = "COMPLETED";
    await auction.save();

    const user = await User.findById(userId);

    const existingDelivery = await Delivery.findOne({ paymentId: payment._id });
    let delivery = existingDelivery;
    if (!delivery) {
        delivery = await Delivery.create({
            userId,
            auctionId: auction._id,
            paymentId: payment._id,
            shippingAddress: {
                line1: user.address.line1,
                line2: user.address.line2,
                city: user.address.city,
                state: user.address.state,
                pincode: user.address.pincode,
                country: user.address.country,
                phone: user.address.phone,
            },
            status: "CREATED",
            timeline: [
                {
                    status: "CREATED",
                    note: "Delivery order created after successful payment",
                },
            ],
        });
    }

    await createAuctionLog({
        auctionId: auction._id,
        userId,
        userName: user?.fullname || user?.username || user?.email || "Buyer",
        type: "AUCTION_BUY_IT_NOW",
        details: {
            amount: auction.buyItNow,
        }
    });

    await pushAdminNotification({
        auctionId: auction._id,
        userId,
        type: "PAYMENT_VERIFICATION",
        message: `Buy It Now payment received for auction - ${auction.title}. Amount: ₹${auction.buyItNow}`,
    });

    await invalidateAuctionMutationCaches({
        auctionId: auction._id,
        previousStatus,
        nextStatus: auction.status,
        creatorId: auction.createdBy,
        affectedUserIds: [userId, auction.auctionWinner],
        clearSavedAuctions: true,
    });

    return res.status(200).json({
        success: true,
        message: "Buy It Now payment verified and auction completed",
        auction,
        payment,
        delivery,
    });
});

// get list of auctions with status filter
// only latest 20 auctions
export const listAuctions = catchErrors(async (req, res) => {
    
    // take status from query
    const { status } = req.query;
    const normalizedStatus = String(status || "").toUpperCase();
    const normalizedStatusKey = normalizedStatus === "ENDED" ? "COMPLETED" : normalizedStatus;
    const cacheKey = `cache:auctions:list:${normalizedStatusKey || "ALL"}`;
    const cached = await cacheGetJson(cacheKey);
    if (cached) {
        return res.status(200).json(cached);
    }

    const statusFilter = normalizedStatus
        ? normalizedStatus === "COMPLETED"
            ? { $in: ["COMPLETED", "ENDED"] }
            : normalizedStatus === "ENDED"
                ? { $in: ["COMPLETED", "ENDED"] }
                : normalizedStatus
        : undefined;

    const filter = {
        ...(statusFilter ? { status: statusFilter } : {}),
        isVerified: true,
    };
    const auctions = await Auction.find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('product')
        .populate('createdBy', 'username fullname email createdAt');

    const response = { success: true, auctions };
    await cacheSetJson(cacheKey, response, getAuctionListCacheTtlSeconds(normalizedStatusKey || "ALL"));
    res.status(200).json(response);
});

export const handleGetMyAuctions = catchErrors(async (req, res) => {
    const userId = req.user._id;

    const auctions = await Auction.find({ createdBy: userId })
        .sort({ createdAt: -1 })
        .populate('product')
        .populate('createdBy', 'username fullname email createdAt')
        .populate('currentWinner', 'username fullname email createdAt')
        .populate('auctionWinner', 'username fullname email createdAt');

    const auctionIds = auctions.map((auction) => auction._id);
    const [payments, deliveries] = await Promise.all([
        Payment.find({ auctionId: { $in: auctionIds } })
            .sort({ createdAt: -1 })
            .lean(),
        Delivery.find({ auctionId: { $in: auctionIds } })
            .sort({ createdAt: -1 })
            .lean(),
    ]);

    const paymentByAuction = new Map();
    for (const payment of payments) {
        const key = String(payment.auctionId);
        if (!paymentByAuction.has(key)) {
            paymentByAuction.set(key, payment);
        }
    }

    const deliveryByAuction = new Map();
    for (const delivery of deliveries) {
        const key = String(delivery.auctionId);
        if (!deliveryByAuction.has(key)) {
            deliveryByAuction.set(key, delivery);
        }
    }

    const items = auctions.map((auction) => {
        const payment = paymentByAuction.get(String(auction._id)) || null;
        const delivery = deliveryByAuction.get(String(auction._id)) || null;
        return {
            auction,
            payment,
            delivery,
            paymentStatus: payment?.status || null,
            deliveryStatus: delivery?.status || null,
            isVerified: Boolean(auction.isVerified),
        };
    });

    return res.status(200).json({
        success: true,
        items,
        total: items.length,
    });
});

// get particular auction details
export const getAuction = catchErrors(async (req, res) => {
  
    const { auctionId } = req.params;
    const auction = await Auction.findById(auctionId)
        .populate('product')
        .populate('createdBy', 'username fullname email createdAt')
        .populate('currentWinner', 'username fullname email createdAt')
        .populate('auctionWinner', 'username fullname email createdAt');

    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const isCreator = String(auction.createdBy?._id || auction.createdBy) === String(req.user._id);
    const isAdmin = req.user?.email && req.user.email === process.env.ADMIN_EMAIL;
    if (!auction.isVerified && !isCreator && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: "Auction is waiting for admin verification",
        });
    }

    const [hasBuyNowPayment, hasWinningPayment] = await Promise.all([
        Payment.exists({ auctionId, type: "BUY_IT_NOW_PAYMENT", status: { $in: ["SUCCESS", "PAID"] } }),
        Payment.exists({ auctionId, type: "WINNING_PAYMENT", status: { $in: ["SUCCESS", "PAID"] } }),
    ]);

    const myDelivery = await Delivery.findOne({ auctionId, userId: req.user._id }).sort({ createdAt: -1 });
    
    res.status(200).json({
        success: true,
        auction,
        paymentStatus: {
            hasBuyNowPayment: Boolean(hasBuyNowPayment),
            hasWinningPayment: Boolean(hasWinningPayment),
        },
        deliveryStatus: myDelivery
            ? { exists: true, status: myDelivery.status, deliveryId: myDelivery._id }
            : { exists: false },
    });
});

export const toggleSaveAuction = catchErrors(async (req, res) => {
    const { auctionId } = req.params;
    const userId = req.user._id;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    if (!auction.isVerified) {
        return res.status(400).json({ success: false, message: "Only verified auctions can be saved" });
    }

    const user = await User.findById(userId);
    const alreadySaved = user.savedAuctions.some((id) => String(id) === String(auctionId));

    if (alreadySaved) {
        user.savedAuctions = user.savedAuctions.filter((id) => String(id) !== String(auctionId));
    } else {
        user.savedAuctions.push(auctionId);
    }

    await user.save();
    await invalidateProfileCachesForUser(userId, {
        includeRecentActivities: false,
        includeMyAuctions: false,
        includeSavedAuctions: true,
        includeWinningAuctions: false,
        includeStats: false,
        includeLegacyMyAuctions: false,
    });

    return res.status(200).json({
        success: true,
        message: alreadySaved ? "Auction removed from saved list" : "Auction saved successfully",
        saved: !alreadySaved,
    });
});

export const handleGetMyDeliveryForAuction = catchErrors(async (req, res) => {
    const { auctionId } = req.params;
    const userId = req.user._id;

    const auction = await Auction.findById(auctionId).select("auctionWinner currentWinner status");
    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const winnerId = auction?.auctionWinner || auction?.currentWinner;
    if (String(winnerId || "") !== String(userId)) {
        return res.status(403).json({ success: false, message: "Only auction winner can track delivery" });
    }

    const delivery = await Delivery.findOne({ auctionId, userId })
        .populate("auctionId", "title status finalPrice")
        .populate("paymentId", "amount status type");

    if (!delivery) {
        return res.status(404).json({ success: false, message: "No delivery order found for this auction" });
    }

    return res.status(200).json({ success: true, delivery });
});