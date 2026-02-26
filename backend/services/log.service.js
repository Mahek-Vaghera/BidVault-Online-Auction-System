import AuctionLog from "../models/auctionlog.model.js";
import { catchErrors } from "../utils/catchErrors.js";

export const createAuctionLog = catchErrors(async ({
    auctionId,
    userId,
    userName,
    type,
    details = {},
}) => {
    await AuctionLog.findOneAndUpdate(
        { auctionId },
        {
            $push: {
                logs: { userId, userName, type, details },
            },
        },
        { upsert: true, new: true } // create if not exists
    );
});