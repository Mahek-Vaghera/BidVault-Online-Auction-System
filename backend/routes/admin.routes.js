import express from "express";
import { handleLogin } from "../controllers/admin.controller.js";
import { validateFields } from "../middlewares/validateFields.middleware.js";

const router = express.Router();

router.post(
    "/login",
    validateFields(["email", "password"]),
    handleLogin
);

export default router;