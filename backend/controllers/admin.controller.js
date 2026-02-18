import { setUser } from "../services/auth.service.js";
import { catchErrors } from "../utils/catchErrors.js";

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

    res.json({
        message: "Login successful",
        token,
    });
});