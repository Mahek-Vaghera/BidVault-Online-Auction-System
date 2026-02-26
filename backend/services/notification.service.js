import AdminNotification from "../models/admin.notify.model.js";
import { catchErrors } from "../utils/catchErrors.js";

export const pushAdminNotification = catchErrors(async ({
    auctionId,
    userId,
    type,
    payment,
    message,
    status = "PENDING",
}) => {
    await AdminNotification.findOneAndUpdate(
        { auctionId },
        {
            $push: {
                notifications: {
                    userId,
                    type,
                    payment,
                    message,
                    status,
                    timestamp: new Date(),
                },
            },
        },
        { upsert: true, new: true }
    ); 
});