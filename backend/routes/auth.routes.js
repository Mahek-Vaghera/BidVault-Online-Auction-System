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
    "/login", 
    validateFields(["email", "password"]), 
    handleLogin
);

router.delete(
    "/logout", 
    restrictToLoggedInUserOnly, 
    handleLogout
);

router.post(
    "/forget-pwd-email", 
    validateFields(["email"]), 
    handleResetPwdEmail
);

router.post(
    "/reset-pwd", 
    validateFields(["email", "newPassword", "confirmNewPassword"]), 
    handleResetPwd
);

export default router;