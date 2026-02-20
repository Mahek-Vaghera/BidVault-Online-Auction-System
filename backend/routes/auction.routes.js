import express from "express";
import {
    handleCreateAuction,
    handleDeleteAuction,
    handleEditAuction,
    handleRegisterInAuction
} from "../controllers/auction.controller.js";

// middlewares
import { restrictToLoggedinUserOnly } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { validateFields } from "../middlewares/validateFields.middleware.js";
import { validateAuctionPayload, validateAuctionEditPayload } from "../middlewares/auction.middleware.js";

const router = express.Router();

router.post("/create", 
    restrictToLoggedinUserOnly, 
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
    restrictToLoggedinUserOnly, 
    upload.array("images", 5),
    validateAuctionEditPayload, 
    handleEditAuction
);

router.delete("/:auctionId", 
    restrictToLoggedinUserOnly, 
    handleDeleteAuction
);

router.post("/:auctionId/register", 
    restrictToLoggedinUserOnly, 
    handleRegisterInAuction
);

// get list of auctions with status filter
// only latest 20 auctions
router.get("/?status=:status",
    restrictToLoggedinUserOnly,
    listAuctions
);

router.get("/:auctionId", 
    restrictToLoggedinUserOnly,
    getAuction
);

export default router;