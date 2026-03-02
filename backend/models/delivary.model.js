import mongoose from "mongoose";

const deliveryTimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [
        "CREATED",
        "ADMIN_APPROVED",
        "ITEM_PICKED",
        "PACKAGING_DONE",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
      ],
    },
    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true, _id: false }
);

const deliverySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "auction",
      required: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "CREATED",
      enum: [
        "CREATED",
        "ADMIN_APPROVED",
        "ITEM_PICKED",
        "PACKAGING_DONE",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
      ],
    },
    shippingAddress: {
      line1: { type: String, required: true },
      line2: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, required: true, default: "India" },
      phone: { type: String, required: true },
    },
    timeline: [deliveryTimelineSchema],
  },
  { timestamps: true }
);

const Delivery = mongoose.model("Delivery", deliverySchema);

export default Delivery;