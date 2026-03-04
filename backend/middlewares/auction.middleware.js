import { catchErrors } from "../utils/catchErrors.js";
import cloudinary from "../config/cloudinary.config.js";
import Auction from "../models/auction.model.js";
import Product from "../models/product.model.js";

// validate auction payload, upload images to cloudinary and create product
export const validateAuctionPayload = catchErrors(async (req, res, next) => {

    // take data from body
    const {
        title,
        productName,
        productCategory,
        productCondition,
        productDescription,
        startingPrice,
        minIncrement,
        buyItNow,
        startTime,
        endTime,
        registrationsStartTime
    } = req.body;

    // validate field types
    if (typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({ success: false, message: "Title is required and must be a non-empty string" });
    }
    if (typeof productName !== "string" || productName.trim() === "") { 
        return res.status(400).json({ success: false, message: "Product name is required and must be a non-empty string" });
    }
    if (typeof productCategory !== "string" || productCategory.trim() === "") {
        return res.status(400).json({ success: false, message: "Product category is required and must be a non-empty string" });
    }
    const validConditions = ["new", "like new", "good", "fair"];
    if (!validConditions.includes(productCondition)) {
        return res.status(400).json({ success: false, message: `Product condition must be one of ${validConditions.join(", ")}` });
    }
    if (typeof productDescription !== "string") {
        return res.status(400).json({ success: false, message: "Product description must be a string" });
    }
    if (isNaN(startingPrice) || startingPrice <= 0) {
        return res.status(400).json({ success: false, message: "Starting price must be a positive number" });
    }
    if (isNaN(minIncrement) || minIncrement <= 0) {
        return res.status(400).json({ success: false, message: "Minimum increment must be a positive number" });
    }
    // buyItNow is optional
    if (buyItNow !== undefined && buyItNow !== null && buyItNow !== "" && (isNaN(buyItNow) || Number(buyItNow) <= 0)) {
        return res.status(400).json({ success: false, message: "Buy It Now price must be a positive number" });
    }
    
    // validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    const regStart = new Date(registrationsStartTime);
    
    if (isNaN(start.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid start time" });
    }
    if (isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid end time" });
    }
    if (isNaN(regStart.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid registrations start time" });
    }
    const now = new Date();
    if (regStart < now || start < now || end < now) {
        return res.status(400).json({ success: false, message: "Auction timeline cannot be set in the past" });
    }
    if (start >= end) {
        return res.status(400).json({ success: false, message: "Start time must be before end time" });
    }   
    if (regStart >= start) {
        return res.status(400).json({ success: false, message: "Registrations start time must be before auction start time" });
    }
    
    // upload images to cloudinary if present
    let uploadedImages = [];

    if (req.files && req.files.length > 0) {

        for (const file of req.files) {

            const uploadResult = await cloudinary.uploader.upload(
                `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
                {
                    folder: "auctions"
                }
            );

            uploadedImages.push({
                public_id: uploadResult.public_id,
                url: uploadResult.secure_url,
            });
        }
    }

    // create Product object
    const product = new Product({
        name: productName,
        category: productCategory,
        condition: productCondition,
        description: productDescription,
        images: uploadedImages.map(img => img.url)
    });

    await product.save();

    // attach product to req.body 
    req.body.product = product;

    next();
});

// validate auction edit payload
// before verification: allow full editable set
// after verification: allow only timeline + description
export const validateAuctionEditPayload = catchErrors(async (req, res, next) => {

    // find auction
    const { auctionId } = req.params;
    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    // Editing is allowed only before registration starts.
    const now = new Date();
    if (auction.registrationsStartTime < now) {
        return res.status(400).json({ success: false, message: "Registration has already started. You cannot edit this auction." });
    }
    if (auction.status === "ENDED" || auction.status === "COMPLETED") {
        return res.status(400).json({ success: false, message: "Auction has already started. You cannot edit this auction." });
    }
    if (auction.status === "CANCELLED") {
        return res.status(400).json({ success: false, message: "Auction has been cancelled. You cannot edit this auction." });
    }
    
    const updates = { ...req.body };
    const fullEditableKeys = [
        "title",
        "productName",
        "productCategory",
        "productCondition",
        "description",
        "startingPrice",
        "minIncrement",
        "buyItNow",
        "registrationsStartTime",
        "startTime",
        "endTime",
    ];
    const limitedEditableKeys = ["registrationsStartTime", "startTime", "endTime", "description"];
    const allowedKeys = new Set(auction.isVerified ? limitedEditableKeys : fullEditableKeys);
    const providedKeys = Object.keys(updates);
    const invalidKeys = providedKeys.filter((key) => !allowedKeys.has(key));
    if (invalidKeys.length > 0) {
        const allowedLabel = auction.isVerified
            ? "registrationsStartTime, startTime, endTime, description"
            : "title, productName, productCategory, productCondition, description, startingPrice, minIncrement, buyItNow, registrationsStartTime, startTime, endTime";
        return res.status(400).json({
            success: false,
            message: `Only these fields can be edited: ${allowedLabel}`,
        });
    }

    if (auction.isVerified && req.files && req.files.length > 0) {
        return res.status(400).json({ success: false, message: "After verification, images cannot be edited" });
    }

    // validate fields if present
    if (updates.startTime) {
        const start = new Date(updates.startTime);
        if (isNaN(start.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid start time" });
        }
        if (start < now) {
            return res.status(400).json({ success: false, message: "Start time cannot be in the past" });
        }
        updates.startTime = start;
    }
    if (updates.endTime) {
        const end = new Date(updates.endTime);
        if (isNaN(end.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid end time" });
        }
        if (end < now) {
            return res.status(400).json({ success: false, message: "End time cannot be in the past" });
        }
        updates.endTime = end;
    }
    if (updates.registrationsStartTime) {
        const regStart = new Date(updates.registrationsStartTime);
        if (isNaN(regStart.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid registrations start time" });
        }
        if (regStart < now) {
            return res.status(400).json({ success: false, message: "Registration start time cannot be in the past" });
        }
        updates.registrationsStartTime = regStart;
    }

    if (updates.title !== undefined) {
        if (typeof updates.title !== "string" || updates.title.trim() === "") {
            return res.status(400).json({ success: false, message: "Title must be a non-empty string" });
        }
        updates.title = updates.title.trim();
    }

    if (updates.productName !== undefined) {
        if (typeof updates.productName !== "string" || updates.productName.trim() === "") {
            return res.status(400).json({ success: false, message: "Product name must be a non-empty string" });
        }
        updates["product.name"] = updates.productName.trim();
        delete updates.productName;
    }

    if (updates.productCategory !== undefined) {
        if (typeof updates.productCategory !== "string" || updates.productCategory.trim() === "") {
            return res.status(400).json({ success: false, message: "Product category must be a non-empty string" });
        }
        updates["product.category"] = updates.productCategory.trim();
        delete updates.productCategory;
    }

    if (updates.productCondition !== undefined) {
        const validConditions = ["new", "like new", "good", "fair"];
        if (!validConditions.includes(updates.productCondition)) {
            return res.status(400).json({ success: false, message: `Product condition must be one of ${validConditions.join(", ")}` });
        }
        updates["product.condition"] = updates.productCondition;
        delete updates.productCondition;
    }

    if (updates.startingPrice !== undefined) {
        if (isNaN(updates.startingPrice) || Number(updates.startingPrice) <= 0) {
            return res.status(400).json({ success: false, message: "Starting price must be a positive number" });
        }
        updates.startingPrice = Number(updates.startingPrice);
    }

    if (updates.minIncrement !== undefined) {
        if (isNaN(updates.minIncrement) || Number(updates.minIncrement) <= 0) {
            return res.status(400).json({ success: false, message: "Minimum increment must be a positive number" });
        }
        updates.minIncrement = Number(updates.minIncrement);
    }

    if (updates.buyItNow !== undefined && updates.buyItNow !== null && updates.buyItNow !== "") {
        if (isNaN(updates.buyItNow) || Number(updates.buyItNow) <= 0) {
            return res.status(400).json({ success: false, message: "Buy It Now must be a positive number" });
        }
        updates.buyItNow = Number(updates.buyItNow);
    }

    if (updates.buyItNow === "") {
        updates.buyItNow = undefined;
    }

    if (updates.description !== undefined) {
        if (typeof updates.description !== "string") {
            return res.status(400).json({ success: false, message: "Description must be a string" });
        }
        updates["product.description"] = updates.description.trim();
        delete updates.description;
    }

    if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map((file) =>
            cloudinary.uploader.upload(
                `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
                { folder: "auctions" }
            )
        );

        const results = await Promise.all(uploadPromises);
        updates["product.images"] = results.map((result) => result.secure_url);
    }

    const nextRegistrationStart = updates.registrationsStartTime || auction.registrationsStartTime;
    const nextStartTime = updates.startTime || auction.startTime;
    const nextEndTime = updates.endTime || auction.endTime;

    if (nextRegistrationStart < now || nextStartTime < now || nextEndTime < now) {
        return res.status(400).json({ success: false, message: "Auction timeline cannot be set in the past" });
    }

    if (nextRegistrationStart >= nextStartTime) {
        return res.status(400).json({ success: false, message: "Registrations start time must be before auction start time" });
    }
    if (nextStartTime >= nextEndTime) {
        return res.status(400).json({ success: false, message: "Auction start time must be before auction end time" });
    }
    
    req.body = updates;
    next();
});