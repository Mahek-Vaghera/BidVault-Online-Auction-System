import mongoose from "mongoose";

const logEntrySchema = new mongoose.Schema({    
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user' 
    },
    userName: { 
        type: String,
        default: "SYSTEM",
        required: true
    },
    type: {
        type: String,
        enum: [
            "AUCTION_CREATED",
            "AUCTION_VERIFIED",
            "AUCTION_REJECTED",
            "USER_REGISTRATION",
            "AUCTION_UPDATED",
            "AUCTION_STARTED",
            "AUCTION_ENDED",
            "AUCTION_CANCELLED",
            "BID_PLACED",
            "AUTOBID_TRIGGERED",
            "AUTOBID_SET",
            "AUTOBID_EDITED",
            "AUTOBID_ACTIVATED",
            "AUTOBID_DEACTIVATED",
            "AUCTION_EXTENDED",
            "AUCTION_WINNER_DECLARED",
            "AUCTION_PAYED"      
        ],
        required: true
    },
    details: { type: Object, default: {} },
}, 
{
    timestamps: true
},
{   
    _id: false  // subdocs don’t need separate ids
});

const auctionLogSchema = new mongoose.Schema({
    auctionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'auction',
        required: true,
        unique: true
    },
    logs: [ logEntrySchema ],
},
{ 
    timestamps: true 
});

const AuctionLog = mongoose.model("auctionLog", auctionLogSchema);

export default AuctionLog;