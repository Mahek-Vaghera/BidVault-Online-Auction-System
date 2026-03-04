import express from "express";
import {
    handleLogin,
    handleAdminLogout,
    getAdminOverview,
    getPendingAuctions,
    getLiveAuctions,
    verifyAuctionByAdmin,
    getAllDeliveriesForAdmin,
    getAllPaymentsForAdmin,
    updateDeliveryStatusByAdmin,
    getAdminNotifications,
} from "../controllers/admin.controller.js";
import { validateFields } from "../middlewares/validateFields.middleware.js";
import { restrictToAdminOnly } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
    "/login",
    validateFields(["email", "password"]),
    handleLogin
);

router.post(
    "/logout",
    restrictToAdminOnly,
    handleAdminLogout
);

router.get(
    "/overview",
    restrictToAdminOnly,
    getAdminOverview
);

router.get(
    "/auctions/pending",
    restrictToAdminOnly,
    getPendingAuctions
);

router.get(
    "/auctions/live",
    restrictToAdminOnly,
    getLiveAuctions
);

router.post(
    "/auctions/:auctionId/verify",
    restrictToAdminOnly,
    verifyAuctionByAdmin
);

router.get(
    "/deliveries",
    restrictToAdminOnly,
    getAllDeliveriesForAdmin
);

router.patch(
    "/deliveries/:deliveryId/status",
    restrictToAdminOnly,
    validateFields(["status"]),
    updateDeliveryStatusByAdmin
);

router.get(
    "/notifications",
    restrictToAdminOnly,
    getAdminNotifications
);

router.get(
    "/payments",
    restrictToAdminOnly,
    getAllPaymentsForAdmin
);

export default router;