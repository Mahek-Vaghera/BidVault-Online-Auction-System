import { setUser } from "../services/auth.service.js";
import { catchErrors } from "../utils/catchErrors.js";
import Auction from "../models/auction.model.js";
import Payment from "../models/payment.model.js";
import Delivery from "../models/delivery.model.js";
import AdminNotification from "../models/admin.notify.model.js";
import { cacheDeleteByPrefix, cacheGetJson, cacheSetJson } from "../services/cache.service.js";

const invalidateAdminCaches = async () => {
    await Promise.all([
        cacheDeleteByPrefix("cache:admin:overview"),
        cacheDeleteByPrefix("cache:admin:auctions:"),
        cacheDeleteByPrefix("cache:admin:payments"),
        cacheDeleteByPrefix("cache:admin:deliveries"),
        cacheDeleteByPrefix("cache:auctions:list:"),
        cacheDeleteByPrefix("cache:my-auctions:"),
    ]);
};

// login admin
export const handleLogin = catchErrors(async (req, res) => {

    // take data from body
    const { email, password } = req.body;

    // verify email and password
    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    // generate token
    const token = setUser({ 
        _id: `admin_${Date.now()}`,
        email: process.env.ADMIN_EMAIL,
    });

    res.cookie("adminToken", token, {
        httpOnly: true,
        sameSite: "lax",
    });

    res.json({
        success: true,
        message: "Login successful",
        token,
    });
});

export const handleAdminLogout = catchErrors(async (req, res) => {
    res.clearCookie("adminToken");
    return res.status(200).json({ success: true, message: "Admin logged out" });
});

export const getAdminOverview = catchErrors(async (req, res) => {
    const cacheKey = "cache:admin:overview";
    const cached = await cacheGetJson(cacheKey);
    if (cached) {
        return res.status(200).json(cached);
    }

    const [
        pendingVerificationAuctions,
        totalVerifiedAuctions,
        totalDeliveries,
        pendingDeliveries,
        paidPayments,
    ] = await Promise.all([
        Auction.countDocuments({ isVerified: false, status: { $ne: "CANCELLED" } }),
        Auction.countDocuments({ isVerified: true }),
        Delivery.countDocuments({}),
        Delivery.countDocuments({ status: { $ne: "DELIVERED" } }),
        Payment.countDocuments({ status: { $in: ["SUCCESS", "PAID"] } }),
    ]);

    const response = {
        success: true,
        stats: {
            pendingVerificationAuctions,
            totalVerifiedAuctions,
            totalDeliveries,
            pendingDeliveries,
            paidPayments,
        },
    };

    await cacheSetJson(cacheKey, response, 30);
    return res.status(200).json(response);
});

export const getPendingAuctions = catchErrors(async (req, res) => {
    const cacheKey = "cache:admin:auctions:pending";
    const cached = await cacheGetJson(cacheKey);
    if (cached) {
        return res.status(200).json(cached);
    }

    const auctions = await Auction.find({
        isVerified: false,
        status: { $ne: "CANCELLED" },
    })
        .sort({ createdAt: -1 })
        .populate("product")
        .populate("createdBy", "username fullname email createdAt");

    const response = {
        success: true,
        auctions,
        total: auctions.length,
    };

    await cacheSetJson(cacheKey, response, 30);
    return res.status(200).json(response);
});

export const getLiveAuctions = catchErrors(async (req, res) => {
    const cacheKey = "cache:admin:auctions:live";
    const cached = await cacheGetJson(cacheKey);
    if (cached) {
        return res.status(200).json(cached);
    }

    const auctions = await Auction.find({
        status: "LIVE",
        isVerified: true,
    })
        .sort({ updatedAt: -1 })
        .populate("product")
        .populate("createdBy", "username fullname email createdAt")
        .populate("currentWinner", "username fullname email");

    const response = {
        success: true,
        auctions,
        total: auctions.length,
    };

    await cacheSetJson(cacheKey, response, 20);
    return res.status(200).json(response);
});

export const verifyAuctionByAdmin = catchErrors(async (req, res) => {
    const { auctionId } = req.params;
    const { verified = true } = req.body;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    auction.isVerified = Boolean(verified);
    if (!verified) {
        auction.status = "CANCELLED";
    }
    await auction.save();
    await invalidateAdminCaches();

    const notification = await AdminNotification.findOne({ auctionId });
    if (notification?.notifications?.length) {
        notification.notifications = notification.notifications.map((entry) => {
            if (entry.type === "AUCTION_VERIFICATION" && entry.status === "PENDING") {
                return {
                    ...entry.toObject(),
                    status: verified ? "CONFIRM" : "REJECT",
                    message: verified
                        ? `${entry.message} (Verified by admin)`
                        : `${entry.message} (Rejected by admin)`,
                };
            }
            return entry;
        });
        await notification.save();
    }

    return res.status(200).json({
        success: true,
        message: verified ? "Auction verified successfully" : "Auction rejected and cancelled",
        auction,
    });
});

export const getAllDeliveriesForAdmin = catchErrors(async (req, res) => {
    const { status } = req.query;
    const normalizedStatus = status
        ? String(status).trim().toUpperCase().replace(/\s+/g, "_").replace("ADMIN_APROVED", "ADMIN_APPROVED")
        : undefined;
    const cacheKey = `cache:admin:deliveries:${normalizedStatus || "ALL"}`;
    const cached = await cacheGetJson(cacheKey);
    if (cached) {
        return res.status(200).json(cached);
    }

    const deliveryFilter = {
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
    };

    const deliveries = await Delivery.find(deliveryFilter)
        .sort({ updatedAt: -1 })
        .populate("auctionId", "title status finalPrice")
        .populate("userId", "username fullname email")
        .populate("paymentId", "amount status type createdAt");

    const response = {
        success: true,
        deliveries,
        total: deliveries.length,
    };

    await cacheSetJson(cacheKey, response, 20);
    return res.status(200).json(response);
});

export const updateDeliveryStatusByAdmin = catchErrors(async (req, res) => {
    const { deliveryId } = req.params;
    const { status, note = "" } = req.body;
    const normalizedStatus = String(status || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_")
        .replace("ADMIN_APROVED", "ADMIN_APPROVED");

    const allowedStatuses = [
        "ADMIN_APPROVED",
        "ITEM_PICKED",
        "PACKAGING_DONE",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
            success: false,
            message: `Invalid delivery status. Allowed: ${allowedStatuses.join(", ")}`,
        });
    }

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
        return res.status(404).json({ success: false, message: "Delivery not found" });
    }

    delivery.status = normalizedStatus;
    delivery.timeline.push({ status: normalizedStatus, note });
    await delivery.save();
    await invalidateAdminCaches();

    return res.status(200).json({
        success: true,
        message: "Delivery status updated",
        delivery,
    });
});

export const getAdminNotifications = catchErrors(async (req, res) => {
    const notifications = await AdminNotification.find({})
        .sort({ updatedAt: -1 })
        .populate("auctionId", "title status isVerified")
        .populate("notifications.userId", "username fullname email");

    return res.status(200).json({
        success: true,
        notifications,
    });
});

export const getAllPaymentsForAdmin = catchErrors(async (req, res) => {
    const { status, category } = req.query;
    const cacheKey = `cache:admin:payments:${category || "ALL"}:${status || "ALL"}`;
    const cached = await cacheGetJson(cacheKey);
    if (cached) {
        return res.status(200).json(cached);
    }

    const paymentFilter = {
        ...(status ? { status } : {}),
    };

    if (category === "registration") {
        paymentFilter.type = "REGISTRATION_FEES";
    } else if (category === "winning") {
        paymentFilter.type = { $in: ["WINNING_PAYMENT", "BUY_IT_NOW_PAYMENT"] };
    }

    const payments = await Payment.find(paymentFilter)
        .sort({ createdAt: -1 })
        .populate("auctionId", "title status finalPrice")
        .populate("userId", "username fullname email");

    const response = {
        success: true,
        payments,
        total: payments.length,
    };

    await cacheSetJson(cacheKey, response, 20);
    return res.status(200).json(response);
});