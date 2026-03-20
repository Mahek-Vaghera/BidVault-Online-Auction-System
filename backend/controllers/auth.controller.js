import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/user.model.js";
import Auction from "../models/auction.model.js";
import Bid from "../models/bid.model.js";
import Payment from "../models/payment.model.js";
import Delivery from "../models/delivery.model.js";
import { generateHashPassword } from "../services/auth.service.js";
import { setUser } from "../services/auth.service.js";
import { SendVerificationCode, SendResetPwdEmail, WelcomeEmail } from "../services/mail_service/email.sender.js";
import { catchErrors } from "../utils/catchErrors.js";
import { cacheGetJson, cacheSetJson } from "../services/cache.service.js";
import { CACHE_TTL_SECONDS } from "../services/cache-ttl.service.js";
import {
  buildProfileMyAuctionsCacheKey,
  buildProfileRecentActivitiesCacheKey,
  buildProfileSavedAuctionsCacheKey,
  buildProfileStatsCacheKey,
  buildProfileWinningAuctionsCacheKey,
  invalidateProfileCachesForUser,
} from "../services/cache-invalidation.service.js";

const isProduction = process.env.NODE_ENV === "production";
const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// register user
export const handleRegister = catchErrors(async (req, res) => {

    // take data from body
    const {username, email, password} = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email})
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ success: false, message: "User already exists" });
      }

      const hashedPassword = await generateHashPassword(password);
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      existingUser.username = username;
      existingUser.password = hashedPassword;
      existingUser.verificationCode = verificationCode;
      await existingUser.save();

      await SendVerificationCode(email, verificationCode);

      return res.status(200).json({
        success: true,
        message: "Account exists but email is unverified. A new verification code has been sent."
      });
    }

    // generate hashed password
    const hashedPassword = await generateHashPassword(password);
    // generate 6 digit verification code
    const verificationCode = Math.floor(100000 + Math.random() *900000).toString();

    // create user
    await User.create({
        username,
        email,
        password: hashedPassword,
        verificationCode,   
    });

    // send verification code to email
    await SendVerificationCode(email, verificationCode);

    res.status(201).json({ success: true, message: "User registered successfully. Please check your email for the verification code." });
});

// verify email
export const verifyEmail = catchErrors(async (req, res)=> {
    
    // take data from body
    const { email, code } = req.body;

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

    // generate token and set cookie
    const token = setUser(user);
    res.cookie("token", token, authCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Email Verified Successfully",
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
      }
    })
});

// login user
export const handleLogin = catchErrors(async (req, res) => {

    // take data from body
    const { email, password } = req.body;

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
      return res.status(401).json({ success: false, code: "EMAIL_NOT_VERIFIED", message: "Email not verified", email: user.email });
    }

    // generate token and set cookie
    const token = setUser(user);
    res.cookie("token", token, authCookieOptions);
  
    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
      }
    });
});

  // resend verification code for unverified user
  export const handleResendVerificationCode = catchErrors(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = verificationCode;
    await user.save();

    await SendVerificationCode(email, verificationCode);

    return res.status(200).json({ success: true, message: "Verification code resent successfully" });
  });

// logout user
export const handleLogout = catchErrors(async (req, res) => {
  
    // clear cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: authCookieOptions.secure,
      sameSite: authCookieOptions.sameSite,
    });

    return res.json({ success: true, message: "Logged out" });
}); 

// reset password email (click on forgot password)
export const handleResetPwdEmail = catchErrors(async (req, res) => {
    // take data from body
    const { email } = req.body;

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

    const resetPwdLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await SendResetPwdEmail(email, resetPwdLink);

    return res.status(200).json({ success: true, message: "Reset Password link is shared in your Email"});
});

// get current user info
export const handleGetMe = catchErrors(async (req, res) => {
    const user = await User.findById(req.user._id).select('-password -verificationCode -resetToken -resetTokenExpiry');
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, user });
});

// get public profile with stats for any user
export const handleGetPublicProfile = catchErrors(async (req, res) => {
  const { userId } = req.params;
  const cacheKey = buildProfileStatsCacheKey(userId);
  const cached = await cacheGetJson(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  const user = await User.findById(userId).select("username fullname email createdAt isVerified");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const [totalAuctions, activeAuctions, completedAuctions, totalBids] = await Promise.all([
    Auction.countDocuments({ createdBy: userId }),
    Auction.countDocuments({ createdBy: userId, status: { $in: ["UPCOMING", "LIVE"] } }),
    Auction.countDocuments({ createdBy: userId, status: { $in: ["COMPLETED", "ENDED"] } }),
    Bid.countDocuments({ userId }),
  ]);

  const response = {
    success: true,
    profile: user,
    stats: {
      totalAuctions,
      activeAuctions,
      completedAuctions,
      totalBids,
    },
  };

  await cacheSetJson(cacheKey, response, CACHE_TTL_SECONDS.PROFILE_STATS);
  return res.status(200).json(response);
});

// get logged-in user's combined recent activity (auctions + bids)
export const handleGetMyActivity = catchErrors(async (req, res) => {
  const userId = req.user._id;
  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
  const skip = Math.max(0, Number(req.query.skip) || 0);
  const cacheKey = buildProfileRecentActivitiesCacheKey(userId, skip, limit);
  const cached = await cacheGetJson(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  const [myAuctions, myBids, myWinningPayments] = await Promise.all([
    Auction.find({ createdBy: userId })
      .select("_id title status currentBid startTime endTime createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    Bid.find({ userId })
      .populate("auctionId", "title status")
      .select("_id amount auctionId createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    Payment.find({
      userId,
      status: { $in: ["SUCCESS", "PAID"] },
      type: { $in: ["BUY_IT_NOW_PAYMENT", "WINNING_PAYMENT"] },
    })
      .populate("auctionId", "title status finalPrice")
      .select("_id amount auctionId type createdAt")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const auctionItems = myAuctions.map((auction) => ({
    id: auction._id,
    type: "AUCTION",
    createdAt: auction.createdAt,
    data: auction,
  }));

  const bidItems = myBids.map((bid) => ({
    id: bid._id,
    type: "BID",
    createdAt: bid.createdAt,
    data: {
      _id: bid._id,
      amount: bid.amount,
      auction: bid.auctionId,
    },
  }));

  const winningItems = myWinningPayments.map((payment) => ({
    id: payment._id,
    type: "WIN",
    createdAt: payment.createdAt,
    data: {
      _id: payment._id,
      amount: payment.amount,
      paymentType: payment.type,
      auction: payment.auctionId,
    },
  }));

  const combined = [...auctionItems, ...bidItems, ...winningItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const paged = combined.slice(skip, skip + limit);

  const response = {
    success: true,
    items: paged,
    total: combined.length,
    hasMore: skip + limit < combined.length,
    nextSkip: skip + limit,
  };

  await cacheSetJson(cacheKey, response, CACHE_TTL_SECONDS.PROFILE_RECENT_ACTIVITIES);
  return res.status(200).json(response);
});

export const handleGetMyAuctions = catchErrors(async (req, res) => {
  const userId = req.user._id;
  const cacheKey = buildProfileMyAuctionsCacheKey(userId);
  const cached = await cacheGetJson(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  const auctions = await Auction.find({ createdBy: userId })
    .sort({ createdAt: -1 })
    .populate('product')
    .populate('createdBy', 'username fullname email createdAt')
    .populate('currentWinner', 'username fullname email createdAt')
    .populate('auctionWinner', 'username fullname email createdAt')
    .lean();

  const auctionIds = auctions.map((auction) => auction._id);

  const [payments, deliveries] = await Promise.all([
    Payment.find({ auctionId: { $in: auctionIds } })
      .sort({ createdAt: -1 })
      .lean(),
    Delivery.find({ auctionId: { $in: auctionIds } })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const paymentByAuction = new Map();
  for (const payment of payments) {
    const key = String(payment.auctionId);
    if (!paymentByAuction.has(key)) {
      paymentByAuction.set(key, payment);
    }
  }

  const deliveryByAuction = new Map();
  for (const delivery of deliveries) {
    const key = String(delivery.auctionId);
    if (!deliveryByAuction.has(key)) {
      deliveryByAuction.set(key, delivery);
    }
  }

  const items = auctions.map((auction) => {
    const payment = paymentByAuction.get(String(auction._id)) || null;
    const delivery = deliveryByAuction.get(String(auction._id)) || null;
    const hasWinningPayment = payment && ["WINNING_PAYMENT", "BUY_IT_NOW_PAYMENT"].includes(payment.type);
    const winningPaymentStatus = hasWinningPayment ? payment.status : null;
    const isPaid = Boolean(hasWinningPayment && ["SUCCESS", "PAID"].includes(payment.status));

    return {
      auction,
      payment,
      delivery,
      verificationStatus: auction.isVerified ? 'VERIFIED' : 'UNDER_VERIFICATION',
      paymentStatus: winningPaymentStatus,
      deliveryStatus: delivery?.status || null,
      isPaid,
      isVerified: Boolean(auction.isVerified),
    };
  });

  const response = {
    success: true,
    items,
    total: items.length,
  };

  await cacheSetJson(cacheKey, response, CACHE_TTL_SECONDS.PROFILE_MY_AUCTIONS);
  return res.status(200).json(response);
});

// reset password (after clicking on reset password link in email)
export const handleResetPwd = catchErrors(async (req, res) => {
    // take data from body
  const { email, token, newPassword, confirmNewPassword } = req.body;

    // find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // check reset token and expiry time
    if (!user.resetToken || !token || user.resetToken !== token || user.resetTokenExpiry < Date.now()) {
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
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return res.status(200).json({ success: true, message: "Password reset successful" });
}); 

export const handleUpdateAddress = catchErrors(async (req, res) => {
  const userId = req.user._id;
  const { line1, line2, city, state, pincode, country, phone } = req.body;

  const requiredFields = { line1, city, state, pincode, country, phone };
  const missing = Object.entries(requiredFields)
    .filter(([, value]) => String(value || "").trim() === "")
    .map(([key]) => key);

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing address fields: ${missing.join(", ")}`,
    });
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        address: {
          line1: String(line1).trim(),
          line2: String(line2 || "").trim(),
          city: String(city).trim(),
          state: String(state).trim(),
          pincode: String(pincode).trim(),
          country: String(country).trim(),
          phone: String(phone).trim(),
        },
      },
    },
    { new: true }
  ).select("username fullname email address");

  await invalidateProfileCachesForUser(userId);

  return res.status(200).json({ success: true, message: "Address updated", user });
});

export const handleGetSavedAuctions = catchErrors(async (req, res) => {
  const userId = req.user._id;
  const cacheKey = buildProfileSavedAuctionsCacheKey(userId);
  const cached = await cacheGetJson(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  const user = await User.findById(req.user._id).populate({
    path: "savedAuctions",
    populate: [
      { path: "product" },
      { path: "createdBy", select: "username fullname email createdAt" },
    ],
  });

  const auctions = (user?.savedAuctions || []).filter((auction) => Boolean(auction && auction.isVerified));

  const response = {
    success: true,
    auctions,
    total: auctions.length,
  };

  await cacheSetJson(cacheKey, response, CACHE_TTL_SECONDS.PROFILE_SAVED_AUCTIONS);
  return res.status(200).json(response);
});

export const handleGetMyWinningAuctions = catchErrors(async (req, res) => {
  const userId = req.user._id;
  const cacheKey = buildProfileWinningAuctionsCacheKey(userId);
  const cached = await cacheGetJson(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  const winningAuctions = await Auction.find({
    status: { $in: ["COMPLETED", "ENDED"] },
    auctionWinner: userId,
  })
    .sort({ updatedAt: -1 })
    .populate("product")
    .populate("createdBy", "username fullname email")
    .lean();

  const auctionIds = winningAuctions.map((auction) => auction._id);

  const [payments, deliveries] = await Promise.all([
    Payment.find({
      userId,
      auctionId: { $in: auctionIds },
      type: { $in: ["WINNING_PAYMENT", "BUY_IT_NOW_PAYMENT"] },
    })
      .sort({ createdAt: -1 })
      .lean(),
    Delivery.find({
      userId,
      auctionId: { $in: auctionIds },
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const paymentByAuction = new Map();
  for (const payment of payments) {
    const key = String(payment.auctionId);
    if (!paymentByAuction.has(key)) {
      paymentByAuction.set(key, payment);
    }
  }

  const deliveryByAuction = new Map();
  for (const delivery of deliveries) {
    const key = String(delivery.auctionId);
    if (!deliveryByAuction.has(key)) {
      deliveryByAuction.set(key, delivery);
    }
  }

  const items = winningAuctions.map((auction) => {
    const payment = paymentByAuction.get(String(auction._id));
    const delivery = deliveryByAuction.get(String(auction._id));
    return {
      auction,
      payment: payment || null,
      delivery: delivery || null,
      isPaid: Boolean(payment && ["SUCCESS", "PAID"].includes(payment.status)),
    };
  });

  const response = {
    success: true,
    items,
    total: items.length,
  };

  await cacheSetJson(cacheKey, response, CACHE_TTL_SECONDS.PROFILE_WINNING_AUCTIONS);
  return res.status(200).json(response);
});