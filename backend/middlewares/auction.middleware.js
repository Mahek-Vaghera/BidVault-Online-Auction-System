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
    if (isNaN(buyItNow) || buyItNow <= 0) {
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

});

// validate auction edit payload, only allow editing startTime, endTime, minIncrement, startingPrice, product.description, product.images
export const validateAuctionEditPayload = catchErrors(async (req, res, next) => {

    // find auction
    const { auctionId } = req.params;
    const auction = await Auction.findById(auctionId);
    if (!auction) {
        return res.status(404).json({ success: false, message: "Auction not found" });
    }

    // if registration has started or auction has ended(by buyItNow), do not allow editing
    const now = new Date();
    if (auction.registrationsStartTime < now) {
        return res.status(400).json({ success: false, message: "Registration has already started. You cannot edit this auction." });
    }
    if (auction.status === "ENDED") {
        return res.status(400).json({ success: false, message: "Auction has already started. You cannot edit this auction." });
    }
    
    // allow editing only startTime, endTime, minIncrement, startingPrice, product.description, product.images
    const allowedFields = [
        "startTime",
        "endTime",
        "minIncrement",
        "startingPrice",
        "description",
        "images"
    ];
    
    // check for invalid fields
    const updates = req.body;
    const invalidFields = Object.keys(updates).filter(
      (field) => !allowedFields.includes(field)
    );
    if (invalidFields.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid fields in update: ${invalidFields.join(", ")}`});
    }

    // validate fields if present
    if (updates.startTime) {
        const start = new Date(updates.startTime);
        if (isNaN(start.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid start time" });
        }
        updates.startTime = start;
    }
    if (updates.endTime) {
        const end = new Date(updates.endTime);
        if (isNaN(end.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid end time" });
        }
        updates.endTime = end;
    }
    if (updates.startingPrice) {
        if (isNaN(updates.startingPrice) || updates.startingPrice <= 0) {
            return res.status(400).json({ success: false, message: "Starting price must be a positive number" });
        }
        updates.startingPrice = Number(updates.startingPrice);
    }
    if (updates.minIncrement) {
        if (isNaN(updates.minIncrement) || updates.minIncrement <= 0) {
            return res.status(400).json({ success: false, message: "Minimum increment must be a positive number" });
        }
        updates.minIncrement = Number(updates.minIncrement);
    }
    if (updates.description) {
        if (typeof updates.description !== "string") {
            return res.status(400).json({ success: false, message: "Description must be a string" });
        }
        updates["product.description"] = updates.description;
        delete updates.description;
    }
    if (updates.images) {

        // upload new images to cloudinary and get urls
        const uploadedImages = [];

        const uploadPromises = updates.images.map(img =>
            cloudinary.uploader.upload(
                `data:image/*;base64,${img}`,
                {
                    folder: "auctions"
                }
            )
        );

        const results = await Promise.all(uploadPromises);

        for (const result of results) {
            uploadedImages.push({
                public_id: result.public_id,
                url: result.secure_url
            });
        }

        updates["product.images"] = uploadedImages; 
        delete updates.images;
    }
    
    req.body = updates;
    next();
});