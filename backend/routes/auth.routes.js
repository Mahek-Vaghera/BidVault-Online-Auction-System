// src/routes/auth.routes.js
import express from "express";
import { 
    handleRegister,
    verifyEmail,
    handleLogin,
    handleLogout,
    handleResetPwdEmail,
    handleResetPwd,
    handleGetMe,
    handleGetPublicProfile,
    handleGetMyActivity,
    handleResendVerificationCode,
    handleUpdateAddress,
    handleGetMyAuctions,
    handleGetSavedAuctions,
    handleGetMyWinningAuctions,
} from "../controllers/auth.controller.js";
import { restrictToLoggedInUserOnly } from "../middlewares/auth.middleware.js";
import { validateFields } from "../middlewares/validateFields.middleware.js";

const router = express.Router();

router.post(
    "/register", 
    validateFields(["username", "email", "password"]), 
    handleRegister
);

router.post(
    "/verify-email", 
    validateFields(["email", "code"]), 
    verifyEmail
);

router.post(
    "/resend-verification",
    validateFields(["email"]),
    handleResendVerificationCode
);

router.post(
    "/login", 
    validateFields(["email", "password"]), 
    handleLogin
);

router.post(
    "/logout", 
    restrictToLoggedInUserOnly, 
    handleLogout
);

router.get(
    "/me",
    restrictToLoggedInUserOnly,
    handleGetMe
);

router.get(
    "/profile/:userId",
    restrictToLoggedInUserOnly,
    handleGetPublicProfile
);

router.get(
    "/my-activity",
    restrictToLoggedInUserOnly,
    handleGetMyActivity
);

router.put(
    "/address",
    restrictToLoggedInUserOnly,
    validateFields(["line1", "city", "state", "pincode", "country", "phone"]),
    handleUpdateAddress
);

router.get(
    "/saved-auctions",
    restrictToLoggedInUserOnly,
    handleGetSavedAuctions
);

router.get(
    "/my-auctions",
    restrictToLoggedInUserOnly,
    handleGetMyAuctions
);

router.get(
    "/winning-auctions",
    restrictToLoggedInUserOnly,
    handleGetMyWinningAuctions
);

router.post(
    "/forget-pwd-email", 
    validateFields(["email"]), 
    handleResetPwdEmail
);

router.post(
    "/reset-pwd", 
    validateFields(["email", "token", "newPassword", "confirmNewPassword"]), 
    handleResetPwd
);

export default router;