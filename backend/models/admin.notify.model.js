import mongoose from "mongoose";

const notificationEntrySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    },

    type: {
        type: String,
        required: true,
        enum: [
            "PAYMENT_VERIFICATION",
            "AUCTION_VERIFICATION",
        ],
    },

    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'payment',
    },
    message: {
        type: String,
    },

    status: {
        type: String,
        default: "PENDING",
        enum: ["PENDING", "CONFIRM", "REJECT"],
    },
},
{
    timestamps: true
},
{ 
    _id: false  // subdocs don’t need separate ids
});

const adminNotificationSchema = new mongoose.Schema({
    auctionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "auction",
        required: true,
        unique: true, 
    },
    notifications: [ notificationEntrySchema ], 
},
{ 
    timestamps: true 
});

const AdminNotification = mongoose.model("adminNotification", adminNotificationSchema);

export default AdminNotification;