import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/user.model.js";
import { generateHashPassword } from "../services/auth.service.js";
import { setUser } from "../services/auth.service.js";
import { SendVerificationCode, SendResetPwdEmail, WelcomeEmail } from "../services/mail_service/email.sender.js";
import { catchErrors } from "../utils/catchErrors.js";

// register user
export const handleRegister = catchErrors(async (req, res) => {

    // take data from body
    const {username, email, password} = req.body;
    // validate data
    if (!username || !email || !password) {
        return res.status(400).json({message: "All fields are required"});
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email})
    if (existingUser) {
        return res.status(400).json({message: "User already exists"});
    }

    // generate hashed password
    const hashedPassword = await generateHashPassword(password);
    // generate 6 digit verification code
    const verificationCode = Math.floor(100000 + Math.random() *900000).toString();

    // create user
    User.create({
        username,
        email,
        password: hashedPassword,
        verificationCode,   
    });

    // send verification code to email
    await SendVerificationCode(email, verificationCode);

    res.status(201).json({message: "User registered successfully. Please check your email for the verification code."});
});

// verify email
export const verifyEmail = catchErrors(async (req, res)=> {
    
    // take data from body
    const { email, code } = req.body;
    // validate data 
    if (!email || !code) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // find user
    const user = await User.findOne({ email, verificationCode: code });
    if (!user) {
      return res.status(400).json({ message: "Invalid User" });
    }

    // verify user
    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();

    // send welcome email
    await WelcomeEmail(user.email, user.username);

    return res.status(200).json({ message: "Email Verified Successfully" })
});

// login user
export const handleLogin = catchErrors(async (req, res) => {

    // take data from body
    const { email, password } = req.body;
    // validate data
    if (!email || !password) {
        return res.status(400).json({ message: "Provide email and password" });
    }

    // find user
    const user = await User.findOne({ email });  
    if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
    }
    // check email verification
    if (!user.isVerified) {
        return res.status(401).json({ message: "Email not verified" });
    }

    // generate token and set cookie
    const token = setUser(user);
    res.cookie("token", token);
  
    return res.json({ message: "Login successful", token, user: { username: user.username, email: user.email } });
});

// logout user
export const handleLogout = catchErrors(async (req, res) => {
  
    // clear cookie
    res.clearCookie("token");

    return res.json({ message: "Logged out" });
}); 

// reset password email (click on forgot password)
export const handleResetPwdEmail = catchErrors(async (req, res) => {
    // take data from body
    const { email } = req.body;
    // validate data
    if (!email) {
      return res.status(400).json({ message: "Enter your verified email" });
    }

    // find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // check email verification
    if (!user.isVerified) {
      return res.status(404).json({ message: "User is not verifid yet, first verify your email" });
    }

    // generate reset token and expiry time
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    // set data
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    const resetPwdLink = `${process.env.FRONTEND_URL}/bidvault/auth/resetpwd?token=${resetToken}`;

    await SendResetPwdEmail(email, resetPwdLink);

    return res.status(200).json({ success: true, message: "Reset Password link is shared in your Email"});
});

// reset password (after clicking on reset password link in email)
export const handleResetPwd = catchErrors(async (req, res) => {
    // take data from body
    const { email, newPassword, confirmNewPassword } = req.body;
    // validate data
    if (!email || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // check reset token and expiry time
    if (!user.resetToken || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ message: "Link expired, please request a new link" });
    }

    // checks
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    const isMatch = await bcrypt.compare(newPassword, user.password);
    if (isMatch) {
      return res.status(400).json({ message: "New password must be different from old password" });
    }

    // save new password
    const hashedPassword = await generateHashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
}); 