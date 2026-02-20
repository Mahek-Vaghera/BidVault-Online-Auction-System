import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema({
    
    title: { 
        type: String, 
        required: true, 
        trim: true 
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product' 
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    status: {
        type: String, 
        enum: ["UPCOMING", "LIVE", "ENDED", "CANCELLED"],
        default: "UPCOMING",
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    startingPrice: { 
        type: Number, 
        required: true 
    },
    minIncrement: { 
        type: Number, 
        required: true 
    },
    buyItNow: {
        type: Number,
    },

    currentBid: { 
        type: Number, 
        default: 0 
    },
    currentWinner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user' 
    },

    startTime: { 
        type: Date, 
        required: true 
    },
    endTime: { 
        type: Date, 
        required: true 
    },

    registrationsStartTime: {
        type: Date,
        default: null
    },
    registrations: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        },
    ],

    auctionWinner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    finalPrice: {
        type: Number
    },

    totalBids: { type: Number, default: 0 },
    totalParticipants: { type: Number, default: 0 },
}, 
{ 
    timestamps: true 
});

const Auction = mongoose.model("auction", auctionSchema);

export default Auction;