import { getUser } from "../services/auth.service.js";
import { catchErrors } from "../utils/catchErrors.js";

// restrict access to logged in users only
export const restrictToLoggedInUserOnly = catchErrors((req, res, next) => {

    // get token from cookies
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ message: "Authentication required" });
    }

    // verify token and get user
    const user = getUser(token);
    if (!user) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }

    // attach user to request object
    req.user = user;
    next();
});

// only check if user is logged in or not, no restrict access
export const checkAuth = catchErrors((req, res, next) => {

    // get token from cookies
    const token = req.cookies?.token;
    if (!token) {
        req.user = null;
        return next();
    }

    // verify token and get user
    const user = getUser(token);

    // attach user to request object
    req.user = user || null;
    next();
});

export const restrictToAdminOnly = catchErrors((req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : req.cookies?.adminToken;

    if (!token) {
        return res.status(401).json({ success: false, message: "Admin authentication required" });
    }

    let user;
    try {
        user = getUser(token);
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired admin token" });
    }

    if (!user || user.email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ success: false, message: "Admin access denied" });
    }

    req.admin = user;
    next();
});