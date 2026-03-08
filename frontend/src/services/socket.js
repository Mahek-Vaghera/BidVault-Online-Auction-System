import io from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"
let socket = null

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    })

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message)
    })
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const getSocket = () => {
  if (!socket) {
    console.warn('⚠️ Socket not connected. Call connectSocket() first.')
    return null
  }
  return socket
}

// Socket event listeners
export const joinAuction = (auctionId) => {
  const socket = getSocket()
  if (socket) {
    socket.emit('join-auction', auctionId)
    console.log(`📍 Joined auction room: ${auctionId}`)
  }
}

export const leaveAuction = (auctionId) => {
  const socket = getSocket()
  if (socket) {
    socket.emit('leave-auction', auctionId)
    console.log(`📍 Left auction room: ${auctionId}`)
  }
}

export const onBidUpdate = (auctionId, callback) => {
  const socket = getSocket()
  if (socket) {
    socket.on('bid-update', (data) => {
      if (data.auctionId === auctionId) {
        callback(data)
      }
    })
  }
}

export const onAuctionExtended = (auctionId, callback) => {
  const socket = getSocket()
  if (socket) {
    socket.on('auction-extended', (data) => {
      if (data.auctionId === auctionId) {
        callback(data)
      }
    })
  }
}

export const onAuctionEnded = (auctionId, callback) => {
  const socket = getSocket()
  if (socket) {
    socket.on('auction-ended', (data) => {
      if (data.auctionId === auctionId) {
        callback(data)
      }
    })
  }
}

export const onAuctionStarted = (auctionId, callback) => {
  const socket = getSocket()
  if (socket) {
    socket.on('auction-started', (data) => {
      if (data.auctionId === auctionId) {
        callback(data)
      }
    })
  }
}

export const onLeaderboardUpdate = (auctionId, callback) => {
  const socket = getSocket()
  if (socket) {
    socket.on('leaderboard-update', (data) => {
      if (data.auctionId === auctionId) {
        callback(data)
      }
    })
  }
}

// Cleanup listeners
export const offBidUpdate = (auctionId) => {
  const socket = getSocket()
  if (socket) {
    socket.off('bid-update')
  }
}

export const offAuctionExtended = (auctionId) => {
  const socket = getSocket()
  if (socket) {
    socket.off('auction-extended')
  }
}

export const offAuctionEnded = (auctionId) => {
  const socket = getSocket()
  if (socket) {
    socket.off('auction-ended')
  }
}

export const offAuctionStarted = (auctionId) => {
  const socket = getSocket()
  if (socket) {
    socket.off('auction-started')
  }
}

export const offLeaderboardUpdate = (auctionId) => {
  const socket = getSocket()
  if (socket) {
    socket.off('leaderboard-update')
  }
}