import Auction from "../models/auction.model.js";
import AutoBid from "../models/autobid.model.js";
import Bid from "../models/bid.model.js";
import User from "../models/user.model.js";
import { SendOutBidEmail } from "./mail_service/email.sender.js";
import { catchErrors } from "../utils/catchErrors.js";

export const handleAutoBids = catchErrors(async (auctionId) => {

    // find auction
    const auction = await Auction.findById(auctionId);
    if (!auction || auction.status !== "LIVE") {
        return;
    }

    const currentBid = Math.max(auction.currentBid, auction.startingPrice);
    const minIncrement = auction.minIncrement;

    // Find all active autobidders for this auction
    const autoBidders = auction.autoBidders;

    if (!autoBidders.length) return;

    // sort autobidders by maxLimit desc and then by createdAt desc (earlier autobids get priority if maxLimit is same)
    autoBidders.sort((a, b) => {
        if (b.maxLimit !== a.maxLimit) {
            return b.maxLimit - a.maxLimit;
        }

        return new Date(a.createdAt) - new Date(b.createdAt);
    });


    let newBidPlaced = false;

    for (const bidder of autoBidders) {

        // check if bidder have highest bid already
        if (String(bidder) === String(auction.currentWinner)) continue;

        // find auto-bid
        const autobid = await AutoBid.findOne({ auction: auctionId, user: bidder });
        // find user 
        const user = await User.findById(bidder);
        if (!user) {
            console.warn(`User with ID ${bidder} not found for auto-bid processing.`);
            continue;
        }

        // check if auto-bid is active
        if (!autobid || !autobid.isActive) continue;

        const nextBid = currentBid + minIncrement;

        // send outbid email if next bid exceeds max limit
        if (nextBid > user.maxLimit) {
            await SendOutBidEmail(
                user.email,
                auction.item.name,
                auction.currentBid,
                user.maxLimit,
                auctionId,
                auction.title
            );
        }

        // find existing bid by this user
        const bid = await Bid.findOne({ auctionId, userId: user._id });
        if (!bid) {
            await Bid.create({
                auctionId,
                userId: user._id,
                amount: nextBid,
            });
        }
        else {
            bid.oldBidAmounts.push(bid.amount);
            bid.amount = nextBid;
            await bid.save();
        }

        autobid.lastBidAmount = nextBid;
        autobid.totalAutoBidsPlaced += 1;
        await autobid.save();

        // Update further auction details
        auction.currentBid = nextBid;
        auction.currentWinner = user._id;
        auction.totalBids += 1;
        await auction.save();

        // logs for auto-bid triggered
        await createAuctionLog({
            auctionId: autobid.auctionId,
            userId: user._id,
            userName: user.name,
            type: "AUTOBID_TRIGGERED",
            details: {
                BidAmount: nextBid
            }
        });

        // extend auction if bid is placed in last 5 minutes
    const now = new Date();
    const auction = await Auction.findById(auctionId);

    const timeDiff = auction.endTime - now;
    if (timeDiff <= 5 * 60 * 1000) {
        auction.endTime = new Date(auction.endTime.getTime() + 5 * 60 * 1000);
        await createAuctionLog({
            auctionId,
            userName: "System",
            type: "AUCTION_EXTENDED",
            details: { newEndTime: auction.endTime },
        });
    }

        newBidPlaced = true;
        break; // only one auto-bid triggers at a time
    }

    // If a new bid was placed, re-check recursively — maybe other autobidders want to respond
    if (newBidPlaced) {
        await handleAutoBids(auctionId);
    }
});