import express from "express";
import { restrictToLoggedInUserOnly } from "../middlewares/auth.middleware.js";
import { validateFields } from "../middlewares/validateFields.middleware.js";
import { validateBid, validateAutobid } from "../middlewares/bid.middleware.js";
import { handlePlaceBid, handleSetAutobid, handleEditAutobid, handleDeactivateAutobid, handleActivateAutobid, handleGetMyAutobid } from "../controllers/bid.controller.js";

const router = express.Router({ mergeParams: true });

// place bid
router.post("/bid", 
    restrictToLoggedInUserOnly,
    validateBid,
    validateFields(["bidAmount"]),  
    handlePlaceBid
);

// set autobid
router.post("/autobid",
    restrictToLoggedInUserOnly,
    validateFields(["maxLimit"]),
    validateAutobid,
    handleSetAutobid
);

router.get("/autobid/me",
    restrictToLoggedInUserOnly,
    handleGetMyAutobid
);

// edit autobid
router.patch("/autobid/:autobidId",
    restrictToLoggedInUserOnly,
    validateFields(["maxLimit"]),
    validateAutobid,
    handleEditAutobid
);

// deactivate autobid
router.post("/autobid/:autobidId/deactivate",
    restrictToLoggedInUserOnly,
    handleDeactivateAutobid
);

// activate autobid
router.post("/autobid/:autobidId/activate",
    restrictToLoggedInUserOnly,
    handleActivateAutobid
);

export default router;