import mongoose from "mongoose";

const autoBidSchema = new mongoose.Schema({
    auctionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'auction',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },

    maxLimit: { 
        type: Number, 
        required: true 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    activatedAt: { 
        type: Date, 
        default: Date.now 
    },

    lastBidAmount: { 
        type: Number, 
        default: 0 
    },
    totalAutoBidsPlaced: { 
        type: Number, 
        default: 0 
    },
    lastTriggeredAt: { type: Date },
},
{
    timestamps: true,
});

const Autobid = mongoose.model("autobid", autoBidSchema);

export default Autobid;