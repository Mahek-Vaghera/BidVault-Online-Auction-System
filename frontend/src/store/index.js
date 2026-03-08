import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  isLoggedIn: false,
  pendingEmail: null,
  setUser: (user) => set({ user, isLoggedIn: !!user }),
  setPendingEmail: (email) => set({ pendingEmail: email }),
  logout: () => set({ user: null, isLoggedIn: false, pendingEmail: null }),
}))

export const useAuctionStore = create((set) => ({
  auctions: [],
  currentAuction: null,
  leaderboard: [],
  bidHistory: [],
  
  setAuctions: (auctions) => set({ auctions }),
  setCurrentAuction: (auction) => set({ currentAuction: auction }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setBidHistory: (bidHistory) => set({ bidHistory }),
  
  updateCurrentAuctionBid: (bidData) => set((state) => ({
    currentAuction: state.currentAuction ? {
      ...state.currentAuction,
      currentBid: bidData.currentBid,
      currentWinner: bidData.currentWinner,
      totalBids: bidData.totalBids,
    } : null,
  })),
  
  extendCurrentAuction: (newEndTime) => set((state) => ({
    currentAuction: state.currentAuction ? {
      ...state.currentAuction,
      endTime: newEndTime,
    } : null,
  })),
  
  endCurrentAuction: (winnerId, winnerName, finalPrice) => set((state) => ({
    currentAuction: state.currentAuction ? {
      ...state.currentAuction,
      status: 'COMPLETED',
      auctionWinner: winnerId,
      finalPrice: finalPrice,
    } : null,
  })),
}))

export const useBidStore = create((set) => ({
  userBid: null,
  autobids: [],
  
  setUserBid: (bid) => set({ userBid: bid }),
  setAutobids: (autobids) => set({ autobids }),
  updateUserBid: (bid) => set({ userBid: bid }),
}))