import express from "express";
import {
    handleCreateAuction,
    handleDeleteAuction,
    handleEditAuction,
    handleRegisterInAuction,
    handleVerifyRegistrationPayment,
    handlePayment,
    handleVerifyWinningPayment,
    handleBuyNow,
    handleVerifyBuyNowPayment,
    toggleSaveAuction,
    handleGetMyDeliveryForAuction,
    listAuctions,
    getAuction
} from "../controllers/auction.controller.js";

// middlewares
import { restrictToLoggedInUserOnly } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { validateFields } from "../middlewares/validateFields.middleware.js";
import { validateAuctionPayload, validateAuctionEditPayload } from "../middlewares/auction.middleware.js";

const router = express.Router();

router.post("/create", 
    restrictToLoggedInUserOnly, 
    upload.array("images", 5),
    validateFields([
        "title", 
        "productName",
        "productCategory",
        "productCondition",
        "productDescription",
        "startingPrice",
        "minIncrement",
        "startTime",
        "endTime",
        "registrationsStartTime"
    ]),
    validateAuctionPayload,
    handleCreateAuction
);

router.patch("/:auctionId", 
    restrictToLoggedInUserOnly, 
    upload.array("images", 5),
    validateAuctionEditPayload, 
    handleEditAuction
);

router.delete("/:auctionId", 
    restrictToLoggedInUserOnly,
    handleDeleteAuction
);

router.post("/:auctionId/register", 
    restrictToLoggedInUserOnly, 
    handleRegisterInAuction
);

router.post("/:auctionId/verify-registration-payment",
    restrictToLoggedInUserOnly,
    handleVerifyRegistrationPayment
);

// when auction ends, winner need to pay the amount
router.post("/:auctionId/pay",
    restrictToLoggedInUserOnly,
    handlePayment
);

router.post("/:auctionId/verify-winning-payment",
    restrictToLoggedInUserOnly,
    handleVerifyWinningPayment
);

router.post("/:auctionId/buy-now",
    restrictToLoggedInUserOnly,
    handleBuyNow
);

router.post("/:auctionId/verify-buy-now-payment",
    restrictToLoggedInUserOnly,
    handleVerifyBuyNowPayment
);

router.post("/:auctionId/save",
    restrictToLoggedInUserOnly,
    toggleSaveAuction
);

router.get("/:auctionId/delivery",
    restrictToLoggedInUserOnly,
    handleGetMyDeliveryForAuction
);

// get list of auctions with status filter
// only latest 20 auctions
router.get("/",
    restrictToLoggedInUserOnly,
    listAuctions
);

router.get("/:auctionId", 
    restrictToLoggedInUserOnly,
    getAuction
);

export default router;