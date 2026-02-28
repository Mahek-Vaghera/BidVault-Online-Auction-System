export const initializeSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join auction room
    socket.on("join-auction", (auctionId) => {
      socket.join(`auction:${auctionId}`);
      console.log(`Socket ${socket.id} joined auction ${auctionId}`);
    });

    // Leave auction room
    socket.on("leave-auction", (auctionId) => {
      socket.leave(`auction:${auctionId}`);
      console.log(`Socket ${socket.id} left auction ${auctionId}`);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

// Helper functions to emit events
export const emitBidUpdate = (io, auctionId, bidData) => {
  io.to(`auction:${auctionId}`).emit("bid-update", {
    auctionId,
    currentBid: bidData.currentBid,
    currentWinner: bidData.currentWinner,
    winnerName: bidData.winnerName,
    totalBids: bidData.totalBids,
    timestamp: new Date()
  });
};

export const emitAuctionExtension = (io, auctionId, newEndTime) => {
  io.to(`auction:${auctionId}`).emit("auction-extended", {
    auctionId,
    newEndTime,
    message: "Auction has been extended by 10 minutes!",
    timestamp: new Date()
  });
};

export const emitAuctionEnd = (io, auctionId, winnerId, winnerName, finalPrice) => {
  io.to(`auction:${auctionId}`).emit("auction-ended", {
    auctionId,
    winnerId,
    winnerName,
    finalPrice,
    message: `Auction ended! Winner is ${winnerName}`,
    timestamp: new Date()
  });
};

export const emitLeaderboardUpdate = (io, auctionId, leaderboard) => {
  io.to(`auction:${auctionId}`).emit("leaderboard-update", {
    auctionId,
    leaderboard,
    timestamp: new Date()
  });
};