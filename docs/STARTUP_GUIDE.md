
# 🚀 BidVault - Quick Start Guide

## Prerequisites Check
Before starting, ensure you have:
- ✅ Node.js 16+ installed (`node --version`)
- ✅ MongoDB installed and running (`mongod`)
- ✅ Redis installed and running (`redis-server`)
- ✅ Git (optional, for version control)

---

## Step 1: Start Required Services

### Terminal 1: Start Redis
```bash
redis-server
```
Expected output: `Ready to accept connections`

### Terminal 2: Start MongoDB
```bash
# Windows:
mongod

# Mac/Linux:
sudo mongod
```
Expected output: `Waiting for connections on port 27017`

---

## Step 2: Backend Setup

### Terminal 3: Backend
```bash
# Navigate to backend directory
cd backend

# Install dependencies (first time only)
npm install

# Create .env file (if not exists)
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your actual credentials
# Required variables:
# - MONGO_URI (keep default for local: mongodb://localhost:27017/bidvault)
# - REDIS_HOST (keep default for local: localhost)
# - JWT_SECRET (set any random string)
# - CLOUDINARY credentials (sign up at cloudinary.com)
# - MAIL credentials (Gmail app password)

# Start backend server
npm run dev
```

**Expected Output:**
```
Server running on port 5000
MongoDB connected successfully
✅ Socket.IO server ready
```

**Verify Backend:**
- Open browser: http://localhost:5000
- Should see: "BidVault Online Auction System"

---

## Step 3: Frontend Setup

### Terminal 4: Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (first time only)
npm install

# Start frontend dev server
npm run dev
```

**Expected Output:**
```
VITE v5.0.8  ready in 1234 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

**Verify Frontend:**
- Open browser: http://localhost:3000
- Should redirect to login page
- Console should show: `✅ Socket.IO connected: [socket-id]`

---

## Step 4: Test the Application

### 4.1 Register New Account
1. Visit http://localhost:3000
2. Click "Register" 
3. Fill form:
   - Username: testuser
   - Email: test@example.com
   - Password: Test@123
4. Click "Create Account"

### 4.2 Create Test Auction
1. After login, click "Create Auction"
2. Fill form:
   - Title: "iPhone 14 Pro"
   - Description: "Brand new sealed iPhone"
   - Starting Price: 50000
   - Min Increment: 1000
   - End Time: (select future date/time)
3. Upload image (optional)
4. Click "Create Auction"

### 4.3 Test Real-Time Bidding
1. Open auction detail page
2. **Open another browser tab/window** (incognito mode)
3. Register another user in new tab
4. Both users view same auction
5. Place bid from first user
6. **Second user should see update instantly** without refresh!

### 4.4 Test Auto-Bid
1. Click "Auto-Bid" tab in auction detail
2. Set max limit: 70000
3. Click "Activate Auto-Bid"
4. From other user account, place manual bid
5. Your auto-bid should trigger automatically

### 4.5 Test Auction Extension
1. Create auction ending in 5 minutes
2. Wait until last 2 minutes
3. Place a bid
4. Auction should extend by 10 minutes automatically
5. All users see "Auction Extended!" notification

---

## 🐛 Troubleshooting

### Issue: "ERR_CONNECTION_REFUSED" in browser console
**Cause:** Backend not running or Socket.IO connection failed

**Solutions:**
1. Verify backend is running: http://localhost:5000 should work
2. Check backend console for errors
3. Verify Redis is running: `redis-cli ping` (should return PONG)
4. Clear browser cache and reload
5. Check browser console for detailed error

### Issue: "Failed to load resource: 404"
**Cause:** API endpoint not found

**Solutions:**
1. Verify backend routes are registered (check server.js)
2. Check API URL in frontend/.env:
   ```
   REACT_APP_API_URL=http://localhost:5000/bidvault
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```
3. Restart both frontend and backend

### Issue: Socket.IO not connecting
**Cause:** CORS or connection issues

**Solutions:**
1. Check backend CORS settings in server.js:
   ```javascript
   cors: {
     origin: ["http://localhost:3000", "http://localhost:5173"],
     credentials: true
   }
   ```
2. Verify Socket.IO is initialized in server.js:
   ```javascript
   app.locals.io = io;
   ```
3. Check frontend socket connection:
   - Should see "✅ Socket.IO connected" in console
   - If not, check REACT_APP_SOCKET_URL in .env

### Issue: Bids not updating in real-time
**Cause:** Socket.IO events not emitting/receiving

**Solutions:**
1. Check backend console for Socket.IO logs
2. Open browser DevTools → Network → WS (WebSocket)
3. Should see Socket.IO connections
4. Verify `app.locals.io = io;` is in server.js
5. Check bid.controller.js uses `req.app.locals.io`

### Issue: Auto-bid not triggering
**Cause:** Redis lock or auto-bid service issue

**Solutions:**
1. Verify Redis is running: `redis-cli ping`
2. Check backend console for Redlock errors
3. Verify auto-bid is active in database
4. Check autobid.service.js for errors

### Issue: MongoDB connection failed
**Cause:** MongoDB not running or wrong URI

**Solutions:**
1. Start MongoDB: `mongod`
2. Verify connection string in backend/.env:
   ```
   MONGO_URI=mongodb://localhost:27017/bidvault
   ```
3. Test connection: `mongo` (should open MongoDB shell)
4. Check port 27017 is not in use

### Issue: "Module not found" errors
**Cause:** Dependencies not installed

**Solutions:**
1. Delete node_modules and package-lock.json
2. Run `npm install` again
3. Verify package.json exists in both folders
4. Check Node.js version: `node --version` (should be 16+)

---

## 🔐 Environment Variables Reference

### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/bidvault

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_super_secret_key_change_this

# Cloudinary (sign up at cloudinary.com)
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Gmail)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_gmail_app_password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/bidvault
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_DEBUG_MODE=true
```

---

## 📊 Verify Production Features

### ✅ Real-Time Updates
- [ ] Bid updates appear instantly for all users
- [ ] Leaderboard updates in real-time
- [ ] Auction extension notifications appear
- [ ] Winner announcement broadcasts to all

### ✅ Concurrency Control
- [ ] Two simultaneous bids process correctly (no race condition)
- [ ] Manual bid deactivates user's auto-bid
- [ ] Auto-bid doesn't trigger on own bid

### ✅ Auto-Bid Engine
- [ ] Auto-bid triggers when outbid
- [ ] Respects max limit and deactivates when exceeded
- [ ] Recursive auto-bidding works (multiple auto-bidders)

### ✅ Auction Extension
- [ ] Triggers when bid placed in last 2 minutes
- [ ] Extends by exactly 10 minutes
- [ ] All users notified of extension

### ✅ Auction Completion
- [ ] Winner declared automatically when auction ends
- [ ] Winner receives email notification
- [ ] Final price displayed correctly
- [ ] Status changes to ENDED

---

## 🎯 Next Steps

1. **Production Deployment:**
   - Deploy backend to Heroku/Railway/Render
   - Deploy frontend to Vercel/Netlify
   - Use MongoDB Atlas (cloud database)
   - Use Redis Cloud or Railway Redis

2. **Add Features:**
   - Payment gateway integration (Razorpay)
   - Admin dashboard
   - Email verification
   - Password reset
   - User ratings and reviews

3. **Performance Optimization:**
   - Add database indexes
   - Implement caching strategies
   - Add rate limiting
   - Load testing

---

## 📱 Browser Console Checklist

### Expected Console Messages (Success):
```
✅ Socket.IO connected: abc123xyz
📍 Joined auction room: 65f7e4b3c2a1d8e9f0123456
```

### Error Messages (Troubleshoot):
```
❌ Socket.IO disconnected: transport close
⚠️ Socket not connected. Call connectSocket() first.
Failed to load resource: net::ERR_CONNECTION_REFUSED
```

If you see errors, refer to Troubleshooting section above.

---

## 🆘 Still Having Issues?

1. **Check all 4 terminals** are running without errors
2. **Clear browser cache** and reload (Ctrl+Shift+R)
3. **Try incognito mode** to rule out extensions
4. **Check firewall** isn't blocking ports 3000, 5000, 6379, 27017
5. **Restart everything** in this order:
   - Redis
   - MongoDB  
   - Backend
   - Frontend

---

**Built with ❤️ for production-level auction systems**

*Last Updated: March 2026*