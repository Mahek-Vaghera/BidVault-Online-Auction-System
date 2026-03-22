# BidVault – Production-Ready Online Auction System

BidVault is a **production-grade, real-time online auction platform** engineered for high-concurrency bidding with atomic transactions, intelligent auto-bidding, distributed locking, and real-time updates. The system maintains fairness, transparency, and integrity at enterprise scale.

---

## 🎯 Key Improvements (Production-Level)

This is a significantly upgraded version from the basic CRUD structure with these production features:

### ✨ Real-Time Architecture
- **Socket.IO with Redis Adapter** - Broadcast updates across distributed instances
- **WebSocket-based Streaming** - Instant bid notifications to all connected users
- **Live Leaderboard** - Top 10 bidders with real-time rank updates
- **Auction Status Streaming** - Extension, completion events broadcast instantly

### 🔒 Concurrency & Atomicity
- **Redlock (Distributed Locks)** - Prevents race conditions in simultaneous bids
- **Atomic Bid Transactions** - Ensures bid state consistency under high load
- **Redis-based State Management** - Fast, reliable concurrent access
- **Lock-free Read Operations** - Optimized for reading leaderboard data

### 🤖 Advanced Bidding Engine
- **Intelligent Auto-Bid Logic** - Smart bid progression with max limit enforcement
- **Race Condition Handling** - Manual vs Auto-bid conflict prevention
- **Recursive Auto-Bid Triggering** - Other auto-bidders respond to new bids
- **Deactivation on Manual Bid** - Prevents bidding conflicts

### ⏰ Auction Extension System
- **Last-Minute Detection** - Triggers when bid placed within 2 minutes
- **10-Minute Extension** - Prevents unfair last-second victories
- **Broadcast Notifications** - All users alerted in real-time
- **Unlimited Extensions** - No cap on extension count

### 🏆 Winner Announcements
- **Automatic Detection** - Cron job checks for ended auctions every minute
- **Live Broadcasting** - Winner announced to all connected users
- **Email Notification** - Winner receives payment link
- **Status Updates** - Auction marked as ENDED with final price

### 📊 Leaderboard System
- **Top 10 Ranking** - Sorted by bid amount descending
- **Real-Time Updates** - Updates on every bid placed
- **Outbid Notifications** - Users alerted when surpassed
- **Persistent Ranking** - Database-backed for accuracy

---

## 🛠️ Technology Stack

### Backend
```
Framework:     Express.js 5.1
Database:      MongoDB 8.19 + Mongoose
Caching/Lock:  Redis 5.8 + Redlock 5.0
Real-Time:     Socket.IO 4.8 + Redis Adapter
Auth:          JWT + bcryptjs
Email:         Nodemailer 7.0
Images:        Cloudinary 2.9
Task Queue:    node-cron 4.2
Validation:    Zod 4.3
```

### Frontend
```
Framework:     React 18
Build Tool:    Vite 5.0
Routing:       React Router 6.20
Real-Time:     Socket.IO Client 4.8
State:         Zustand 4.4
HTTP:          Axios 1.6
Styling:       Tailwind CSS 3.4
UI Library:    Lucide React 0.294
Date Utils:    date-fns 2.30
```

---

## 📦 Installation & Setup

### System Requirements
- Node.js 16+ (18+ recommended)
- MongoDB 4.0+
- Redis 6.0+
- npm or yarn

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Create environment file
cat > .env << EOF
MONGO_URI=mongodb://localhost:27017/bidvault
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
PORT=5000
NODE_ENV=development
EOF

# 4. Start development server
npm run dev

# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# Frontend runs on http://localhost:3000
```

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────┐
│    React SPA (Port 3000)         │
│  - Real-time UI                  │
│  - Responsive design             │
│  - Socket.IO client              │
└──────────────┬───────────────────┘
               │ HTTP + WebSocket
               ▼
┌──────────────────────────────────┐
│   Express Server (Port 5000)     │
│  - RESTful API                   │
│  - Socket.IO server              │
│  - Cron jobs                     │
└────┬──────────────┬──────────────┘
     ▼              ▼
┌──────────┐  ┌──────────────────┐
│ MongoDB  │  │ Redis            │
│ (Data)   │  │ - Cache          │
│          │  │ - Locks          │
│          │  │ - Pub/Sub        │
└──────────┘  └──────────────────┘
```

---

## 🔐 Concurrency Control System

### Redis Distributed Locking (Redlock)

The system uses Redlock to prevent race conditions during simultaneous bid placements:

```javascript
// Lock Configuration
{
  driftFactor: 0.01,  // 1% clock drift
  retryCount: 3,      // 3 retry attempts
  retryDelay: 200,    // 200ms initial delay
  retryJitter: 200    // ±200ms jitter
}

// Lock Duration
- Bid placement: 5 seconds
- Auto-bid processing: 10 seconds
- Automatic extension: 5 seconds
```

### Race Condition Prevention

1. **Simultaneous Manual Bids**:
   - User A places bid at T+0ms → Acquires lock
   - User B places bid at T+1ms → Waits for lock
   - User A's bid processed → Lock released
   - User B's bid validated against new state → Processed

2. **Manual vs Auto-Bid Conflict**:
   - Manual bid deactivates user's auto-bids atomically
   - Auto-bid skips user if they already won
   - No two bid types active simultaneously

3. **Auto-Bid Cascading**:
   - Initial bid placed with lock
   - Lock extended for recursive check
   - Other auto-bidders can respond
   - Process repeats until no more bids

---

## ⚡ Real-Time Features

### Socket.IO Implementation

**Server Broadcasting**:
```javascript
// Bid updated
io.to(`auction:${auctionId}`).emit('bid-update', {
  auctionId, currentBid, currentWinner, totalBids
})

// Auction extended
io.to(`auction:${auctionId}`).emit('auction-extended', {
  auctionId, newEndTime, message
})

// Auction ended
io.to(`auction:${auctionId}`).emit('auction-ended', {
  auctionId, winnerId, winnerName, finalPrice
})

// Leaderboard updated
io.to(`auction:${auctionId}`).emit('leaderboard-update', {
  auctionId, leaderboard
})
```

**Client Listening**:
```javascript
// Join auction room
socket.emit('join-auction', auctionId)

// Listen for updates
socket.on('bid-update', (data) => { /* update UI */ })
socket.on('auction-extended', (data) => { /* show toast */ })
socket.on('auction-ended', (data) => { /* show modal */ })
```

---

## 🤖 Auto-Bid Engine

### Algorithm Flow

```
1. Manual bid placed with lock
2. Fetch all active auto-bidders for auction
3. Sort by maxLimit (DESC) - Highest bidders first
4. For each auto-bidder (in order):
   a. Skip if already highest bidder
   b. Check if auto-bid is active
   c. Calculate nextBid = currentBid + minIncrement
   d. If nextBid > maxLimit:
      - Send outbid email
      - Deactivate auto-bid
      - Continue to next bidder
   e. Else:
      - Update bid record
      - Update auction state
      - Log bid
      - Emit real-time update
      - Set flag: newBidPlaced = true
5. If newBidPlaced:
   - Extend lock
   - Recurse to step 3 (other auto-bidders may respond)
6. Release lock and return
```

### Key Features

- **Sequential Processing**: Only one auto-bid at a time (via lock)
- **Recursive Bidding**: Multiple auto-bids in cascade
- **Limit Enforcement**: Stops when max limit exceeded
- **Email Notifications**: Outbid notifications sent
- **Deactivation**: Auto-bid deactivated when limit exceeded

---

## ⏰ Auction Extension Logic

### Trigger Condition
```javascript
// Check after every bid placement
const timeDiff = auction.endTime - now;
if (timeDiff <= 2 * 60 * 1000 && timeDiff > 0) {
  // Extend by 10 minutes
  auction.endTime = new Date(auction.endTime.getTime() + 10 * 60 * 1000);
}
```

### Broadcasting
```javascript
// Emit to all users in auction room
io.to(`auction:${auctionId}`).emit('auction-extended', {
  auctionId,
  newEndTime: auction.endTime,
  message: 'Auction extended by 10 minutes!',
  timestamp: new Date()
})
```

### Effects
- **No Limit**: Can extend indefinitely
- **Fair Bidding**: Prevents last-second surprises
- **Continuous Updates**: All users see new end time
- **Logged**: Every extension recorded in audit log

---

## 🏆 Winner Announcement System

### Automated Auction Completion

**Cron Job** (runs every minute):
```javascript
cron.schedule("* * * * *", async () => {
  // Find all LIVE auctions with endTime <= now
  const endedAuctions = await Auction.find({
    status: "LIVE",
    endTime: { $lte: new Date() }
  });

  // For each ended auction:
  for (const auction of endedAuctions) {
    // 1. Mark as ENDED
    auction.status = "ENDED";
    
    // 2. Set winner and final price
    if (auction.currentWinner) {
      auction.auctionWinner = auction.currentWinner;
      auction.finalPrice = auction.currentBid;
    }
    
    // 3. Save to database
    await auction.save();
    
    // 4. Create audit log
    await createAuctionLog({ ... });
    
    // 5. Send winner email
    await SendAuctionEndedEmail( ... );
    
    // 6. Broadcast to all users
    io.to(`auction:${auction._id}`).emit('auction-ended', {
      ...
    });
  }
});
```

### Real-Time Broadcasting
```javascript
// All connected users in auction room see:
{
  auctionId,
  winnerId,
  winnerName,
  finalPrice,
  message: "Auction ended! Winner is John Doe with bid ₹5000",
  timestamp: new Date()
}
```

---

## 📊 Leaderboard System

### Top 10 Bidders

**Data Structure**:
```javascript
{
  rank: 1,              // 1-10
  userId: "...",
  userName: "John Doe",
  bidAmount: 5000,      // Highest bid
  previousBids: 3,      // Total bids count
  isCurrentWinner: true,
  bidDate: "2024-12-21T10:30:00.000Z"
}
```

**Query Optimization**:
```javascript
// Fetch top 10 bids with user info
await Bid.find({ auctionId })
  .sort({ amount: -1 })
  .limit(10)
  .populate("userId", "name email username")
  .exec()
```

**Real-Time Updates**:
```javascript
// Emit to all users after each bid
io.to(`auction:${auctionId}`).emit('leaderboard-update', {
  auctionId,
  leaderboard: [...],  // Top 10 with new rankings
  timestamp: new Date()
})
```

---

## 🎨 UI/UX Features

### Color Psychology

The color scheme is psychologically optimized for auction platform:

- **Primary Blue** `#0284c7`: Trust, professionalism, stability
- **Accent Orange** `#f97316`: Excitement, urgency, action (bidding)
- **Success Green** `#22c55e`: Positive outcomes, wins, completion
- **Danger Red** `#ef4444`: Alerts, outbid warnings, critical actions

### Responsive Design

```
Mobile (320px)   → 1-column layout
Tablet (768px)   → 2-column layout
Desktop (1024px) → 3-column with sidebar
```

### Key Pages

1. **Login/Register**: OAuth-style design
2. **Dashboard**: Auction grid with filters & stats
3. **Auction Detail**: Full auction info + real-time bid form + leaderboard
4. **Create Auction**: Multi-step form with image upload
5. **Profile**: User stats and activity history

---

## 📡 Complete API Reference

### Authentication
```
POST   /bidvault/auth/register
POST   /bidvault/auth/login
POST   /bidvault/auth/logout
GET    /bidvault/auth/me
```

### Auctions
```
GET    /bidvault/auctions              (list with filters)
GET    /bidvault/auctions/:id          (get single)
POST   /bidvault/auctions/create
PATCH  /bidvault/auctions/:id
DELETE /bidvault/auctions/:id
POST   /bidvault/auctions/:id/register
POST   /bidvault/auctions/:id/pay
```

### Bidding
```
POST   /bidvault/auctions/:id/bid
POST   /bidvault/auctions/:id/autobid
PATCH  /bidvault/auctions/:id/autobid/:autobidId
POST   /bidvault/auctions/:id/autobid/:autobidId/activate
POST   /bidvault/auctions/:id/autobid/:autobidId/deactivate
```

### Leaderboard
```
GET    /bidvault/auctions/:id/leaderboard
GET    /bidvault/auctions/:id/history
GET    /bidvault/auctions/:id/my-bid
```

---

## ✅ Production Readiness Checklist

- [x] **Concurrency**: Redis-based distributed locking
- [x] **Real-Time**: Socket.IO with Redis adapter
- [x] **Auto-Bidding**: Race condition prevention
- [x] **Auction Extension**: 2-minute trigger, 10-minute extension
- [x] **Winner Detection**: Cron-based automatic detection
- [x] **Winner Broadcasting**: Real-time to all users
- [x] **Leaderboard**: Top 10 with real-time updates
- [x] **Email Notifications**: Outbid, winner, auction ended
- [x] **Error Handling**: Try-catch with proper error messages
- [x] **Input Validation**:zod schemas
- [x] **Authentication**: JWT with secure storage
- [x] **Frontend**: Production-grade React with Tailwind
- [x] **Responsive**: Mobile, tablet, desktop
- [ ] Rate limiting (optional)
- [ ] API caching headers
- [ ] Database query indexing
- [ ] Load testing (recommended)

---

## 🚀 Running the Application

### Terminal 1: Redis
```bash
redis-server
# or
redis-server --port 6379
```

### Terminal 2: MongoDB
```bash
mongod
# or specify data path
mongod --dbpath /path/to/db
```

### Terminal 3: Backend
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

### Terminal 4: Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

---

## 🧪 Testing Workflow

### Test Real-Time Bidding
1. Open 2 browser tabs
2. Both login and navigate to same auction
3. User A: Place bid
4. User B: Should see update instantly

### Test Auto-Bidding
1. User A: Set auto-bid with $1000 limit
2. User B: Place manual bid $500
3. User A: Auto-bid should trigger at $550
4. Both: See updated leaderboard

### Test Auction Extension
1. Create auction ending in 3 minutes
2. Place bid at 2:30 mark
3. Verify: Auction extended by 10 minutes
4. All users: See "Auction Extended!" toast

### Test Auction Completion
1. Wait for auction to end
2. Winner: Receive email notification
3. All users: See winner announcement
4. Status: Changes to ENDED

---

## 📊 Performance Notes

- **Socket.IO Redis Adapter**: Enables horizontal scaling
- **Redlock**: 5-second lock timeout prevents deadlocks
- **Auto-retry**: 3 attempts with exponential backoff
- **Query Optimization**: Indexed MongoDB fields for fast lookups
- **Frontend Vite**: Hot module replacement for development

---

## 🧬 Key Design Decisions

1. **Why Redlock?** - Distributed locking across instances
2. **Why Socket.IO?** - Cross-browser real-time support
3. **Why Zustand?** - Lightweight state with no boilerplate
4. **Why Tailwind?** - Rapid UI development with consistency
5. **Why Cron?** - Reliable background job execution

---

## 🤝 Contributing

See CONTRIBUTING.md for guidelines

---

## 📄 License

MIT

---

**Engineered for Scale. Built for Fairness. Designed for Speed.**

*Last Updated: December 2024*