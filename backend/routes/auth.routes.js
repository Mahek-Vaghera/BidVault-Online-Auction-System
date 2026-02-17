// src/routes/auth.routes.js
import express from "express";
import { 
    handleRegister,
    verifyEmail,
    handleLogin,
    handleLogout,
    handleResetPwdEmail,
    handleResetPwd
} from "../controllers/auth.controller.js";
import { restrictToLoggedInUserOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", handleRegister);

router.post("/verify-email", verifyEmail);

router.post("/login", handleLogin);

router.delete("/logout", restrictToLoggedInUserOnly, handleLogout);

router.post("/forget-pwd-email", handleResetPwdEmail);

router.post("/reset-pwd", handleResetPwd);

export default router;