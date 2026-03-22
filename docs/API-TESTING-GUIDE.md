# BidVault API Testing & Validation Guide

**Document Status**: Comprehensive Testing Framework  
**Last Updated**: April 12, 2026  
**Purpose**: Systematic testing of all backend APIs before production deployment

### Current Validation Snapshot
- Automated E2E flow: PASS (`backend/e2e-flow.mjs`)
- Frontend production build: PASS (`frontend npm run build`)
- Static diagnostics: no compile/lint diagnostics in modified backend/frontend source files
- Remaining manual check: verify multi-client realtime UI behavior (two browsers) for `leaderboard-update` rendering and winner panel refresh

---

## 1. TEST CREDENTIALS

### Seller Account
- Email: `vatsalchandrani.dev@gmail.com`
- Password: `vatsal1234`
- Role: Seller (can create auctions)

### Buyer Account  
- Email: `vatsalchandrani.code@gmail.com`
- Password: `vatsal1234`
- Role: Buyer (can bid, register, set autobid)

### Payment Testing
- **Razorpay Test Mode**: All endpoints use test credentials from `.env`
- **Test Card**: Use `4111111111111111` (standard Razorpay test card)
- **Expiry**: Any future date (e.g., 12/25)
- **CVV**: Any 3 digits

---

## 2. API ENDPOINTS & TESTING METHODOLOGY

### Section A: Authentication APIs

#### 1.1 Register New User
**Endpoint**: `POST /auth/register`

**Request Body**:
```json
{
  "fullname": "Test User",
  "username": "testuser123",
  "email": "testuser@example.com",
  "password": "Test@1234"
}
```

**Expected Response** (201):
```json
{
  "success": true,
  "message": "Registration successful. Check your email for verification.",
  "user": {
    "_id": "...",
    "email": "testuser@example.com",
    "fullname": "Test User"
  }
}
```

**Test Cases**:
- ✓ Valid registration creates user as unverified
- ✓ Verification email sent
- ✓ Duplicate email rejected with 400
- ✓ Weak password rejected
- ✓ RE-registration with unverified email updates password & sends new code

**Status**: 🔄 NEEDS TESTING

---

#### 1.2 Send/Resend Verification Email
**Endpoint**: `POST /auth/send-verification-code` OR `POST /auth/resend-verification`

**Request Body**:
```json
{
  "email": "testuser@example.com"
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

**Test Cases**:
- ✓ Email sent for unverified users
- ✓ Email NOT sent if user already verified
- ✓ New code overwrites old code
- ✓ Code expires after 10 minutes (if implemented)
- ✓ Rate limiting on resend (if implemented)

**Known Implementation**: Endpoint was added in recent fixes to auth routes

**Status**: 🔄 NEEDS TESTING

---

#### 1.3 Verify Email with Code
**Endpoint**: `POST /auth/verify-email`

**Request Body**:
```json
{
  "email": "testuser@example.com",
  "code": "123456"
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": {
    "_id": "...",
    "email": "testuser@example.com",
    "fullname": "Test User",
    "isEmailVerified": true
  }
}
```

**Test Cases**:
- ✓ Valid code verifies user
- ✓ Invalid code rejected with 400
- ✓ Expired code rejected
- ✓ Returns full user object with `_id`
- ✓ Subsequent login doesn't require re-verification
- ✓ User can now see profile and auctions

**Status**: 🔄 NEEDS TESTING

---

#### 1.4 Login User
**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "vatsalchandrani.dev@gmail.com",
  "password": "vatsal1234"
}
```

**Expected Response - Verified User** (200):
```json
{
  "success": true,
  "user": {
    "_id": "...",
    "email": "vatsalchandrani.dev@gmail.com",
    "fullname": "Vatsal Chandrani",
    "isEmailVerified": true
  }
}
```

**Expected Response - Unverified User** (400):
```json
{
  "success": false,
  "code": "EMAIL_NOT_VERIFIED",
  "email": "testuser@example.com",
  "message": "Please verify your email first"
}
```

**Test Cases**:
- ✓ Verified user logs in successfully
- ✓ Unverified user gets EMAIL_NOT_VERIFIED code
- ✓ Invalid credentials rejected with 401
- ✓ User object includes `_id` for creator checks
- ✓ Cookie set for authenticated requests
- ✓ Frontend can redirect unverified users to verify page

**Recent Changes**: Login now returns `code: 'EMAIL_NOT_VERIFIED'` + `email` for unverified users

**Status**: 🔄 NEEDS TESTING

---

#### 1.5 Logout User
**Endpoint**: `POST /auth/logout`

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Test Cases**:
- ✓ Clears authentication cookie
- ✓ Subsequent requests without cookie return 401
- ✓ Can login again after logout

**Status**: 🔄 NEEDS TESTING

---

### Section B: Auction Management APIs

#### 2.1 Create Auction
**Endpoint**: `POST /auctions/create`

**Request Body** (multipart form-data):
```
title: "iPhone 15 Pro"
description: "Mint condition, 256GB"
startingPrice: 45000
minIncrement: 1000
registrationStart: 2026-04-12T14:30:00Z
registrationEnd: 2026-04-12T15:00:00Z
startTime: 2026-04-12T15:05:00Z
endTime: 2026-04-12T16:00:00Z
buyItNow: 80000
productImage: [file]
```

**Expected Response** (201):
```json
{
  "success": true,
  "auction": {
    "_id": "...",
    "title": "iPhone 15 Pro",
    "status": "UPCOMING",
    "createdBy": "...",
    "registrations": [],
    "buyItNow": 80000
  }
}
```

**Test Cases**:
- ✓ Only logged-in users can create
- ✓ Seller cannot bid/register in own auction
- ✓ Auction created in UPCOMING status
- ✓ Times validated (registration < start < end)
- ✓ buyItNow optional, validated if provided
- ✓ Image uploaded to Cloudinary
- ✓ Creator stored correctly

**Recent Changes**: Buy It Now price is validated as positive number

**Status**: 🔄 NEEDS TESTING

---

#### 2.2 Get Auction Details
**Endpoint**: `GET /auctions/:auctionId`

**Expected Response** (200):
```json
{
  "auction": {
    "_id": "...",
    "title": "iPhone 15 Pro",
    "status": "UPCOMING",
    "currentBid": 0,
    "currentWinner": null,
    "registrations": [...],
    "autoBidders": [...],
    "buyItNow": 80000,
    "startTime": "...",
    "endTime": "...",
    "createdBy": "..."
  }
}
```

**Test Cases**:
- ✓ Returns complete auction object
- ✓ Returns 404 for invalid auctionId
- ✓ Works for UPCOMING, LIVE, ENDED, CANCELLED auctions
- ✓ Includes buyItNow field
- ✓ Includes autoBidders array

**Status**: 🔄 NEEDS TESTING

---

#### 2.3 List All Auctions (with Status Filtering)
**Endpoint**: `GET /auctions`  
**Query Params**: `status=UPCOMING&limit=10&page=1`

**Expected Response** (200):
```json
{
  "auctions": [...],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

**Test Cases**:
- ✓ Returns paginated auctions
- ✓ Filter by status (UPCOMING, LIVE, ENDED, CANCELLED)
- ✓ Search functionality (if implemented)
- ✓ Sorting by date/price (if implemented)

**Status**: 🔄 NEEDS TESTING

---

#### 2.4 Register for Auction
**Endpoint**: `POST /auctions/:auctionId/register`

**Request Body**:
```json
{}
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Payment order created",
  "order": {
    "id": "order_...",
    "amount": 5000,
    "currency": "INR"
  }
}
```

**Test Cases**:
- ✓ Only verified users can register
- ✓ Registration only during registration window
- ✓ Razorpay order created (amount = registration fee)
- ✓ Order ID valid and unique
- ✓ Receipt ≤ 40 characters (FIXED recently)
- ✓ Creator cannot register in own auction
- ✓ User cannot register twice in same auction
- ✓ Returns order for payment verification

**Recent Changes**: 
- Fixed receipt generation to use short ID format
- Fixed Razorpay error reporting

**Status**: 🔄 NEEDS TESTING

---

#### 2.5 Verify Registration Payment
**Endpoint**: `POST /auctions/:auctionId/verify-registration-payment`

**Request Body**:
```json
{
  "razorpay_payment_id": "pay_...",
  "razorpay_order_id": "order_...",
  "razorpay_signature": "signature..."
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Registration completed",
  "auction": {
    "_id": "...",
    "registrations": [...],
    "status": "UPCOMING" or "LIVE"
  }
}
```

**Test Cases**:
- ✓ Valid Razorpay signature accepted
- ✓ Invalid signature rejected with 400
- ✓ User added to registrations array
- ✓ Payment record created
- ✓ User now eligible for bidding
- ✓ If registration closes, auction transitions to LIVE
- ✓ Cannot verify same payment twice (idempotency)

**Status**: 🔄 NEEDS TESTING

---

### Section C: Bidding APIs

#### 3.1 Place Manual Bid
**Endpoint**: `POST /auctions/:auctionId/bid`

**Request Body**:
```json
{
  "auctionId": "...",
  "bidAmount": 46000
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "bid": {
    "_id": "...",
    "auctionId": "...",
    "userId": "...",
    "amount": 46000
  },
  "auction": {
    "currentBid": 46000,
    "currentWinner": "...",
    "totalBids": 1
  }
}
```

**Test Cases**:
- ✓ Only registered users can bid
- ✓ Only during LIVE status
- ✓ Bid amount > currentBid + minIncrement
- ✓ Bid amount ≥ startingPrice (if first bid)
- ✓ User with active autobid gets error message
- ✓ Deactivates any existing autobid for this user
- ✓ Auction currentBid updated
- ✓ Auction endTime extended 10min if bid in last 2min
- ✓ RedisLock prevents race conditions ✓ RECENTLY FIXED
- ✓ Socket.IO updates broadcast to all users
- ✓ Out-bid user receives email notification

**Recent Changes**: Replaced Redlock v5-beta with custom Redis lock

**Status**: 🔄 NEEDS TESTING

---

#### 3.2 Set Auto-Bid (Pre-Auction or Live)
**Endpoint**: `POST /auctions/:auctionId/autobid`

**Request Body**:
```json
{
  "auctionId": "...",
  "maxLimit": 60000
}
```

**Expected Response - Success** (201):
```json
{
  "success": true,
  "autobid": {
    "_id": "...",
    "auctionId": "...",
    "userId": "...",
    "maxLimit": 60000,
    "isActive": true
  }
}
```

**Expected Response - Not Registered** (403):
```json
{
  "success": false,
  "message": "Please register in this auction first, then set Auto-Bid"
}
```

**Test Cases**:
- ✓ User must be registered in auction first (403 if not)
- ✓ Can set before auction starts (UPCOMING) ✓ RECENTLY ADDED
- ✓ Can set during LIVE status ✓ RECENTLY ADDED
- ✓ Can only set once per user per auction
- ✓ maxLimit must be > currentBid
- ✓ Deactivates any manual bid for this user
- ✓ isActive = true initially
- ✓ Auction autoBidders array updated ✓ RECENTLY FIXED
- ✓ UI shows autobid form only to registered users during registration window
- ✓ Socket.IO updates broadcast

**Recent Changes**:
- Autobid form now visible and settable during registration window (UPCOMING status)
- Frontend expanded to show autobid form to unregistered users with "register first" guard
- Backend checks for active autobid when placing manual bids

**Status**: 🔄 NEEDS TESTING

---

#### 3.3 Get My Auto-Bid
**Endpoint**: `GET /auctions/:auctionId/autobid/me`

**Expected Response** (200):
```json
{
  "success": true,
  "data": {
    "autobid": {
      "_id": "...",
      "auctionId": "...",
      "userId": "...",
      "maxLimit": 60000,
      "isActive": true
    }
  }
}
```

**Test Cases**:
- ✓ Returns current user's autobid for the auction
- ✓ Returns `autobid: null` when not configured
- ✓ Frontend uses this to prefill edit/toggle controls

**Status**: 🔄 NEEDS TESTING

---

#### 3.4 Get Bidding History
**Endpoint**: `GET /auctions/:auctionId/history`

**Expected Response** (200):
```json
{
  "bids": [
    {
      "bidder": { "name": "...", "email": "..." },
      "amount": 46000,
      "timestamp": "..."
    }
  ]
}
```

**Test Cases**:
- ✓ Returns bids in descending order (highest first)
- ✓ Includes bidder name, amount, timestamp
- ✓ Works for all auction statuses
- ✓ Returns 404 for invalid auctionId

**Status**: 🔄 NEEDS TESTING

---

### Section D: Buy It Now APIs

#### 4.1 Create Buy It Now Order
**Endpoint**: `POST /auctions/:auctionId/buy-now`

**Request Body**:
```json
{}
```

**Expected Response** (200):
```json
{
  "success": true,
  "order": {
    "id": "order_...",
    "amount": 80000,
    "currency": "INR"
  }
}
```

**Expected Response - Not Available** (400):
```json
{
  "success": false,
  "message": "Buy It Now not available for this auction"
}
```

**Test Cases**:
- ✓ Only available for UPCOMING auctions
- ✓ Must be before registration starts
- ✓ creator cannot use buy-now
- ✓ Creates Razorpay order with BIN amount
- ✓ Receipt < 40 chars ✓ RECENTLY FIXED
- ✓ Order returned for frontend modal
- ✓ Button not visible in frontend if not available
- ✓ Button visible in UI when conditions met ✓ RECENTLY ADDED

**Recent Changes**: 
- Added `handleBuyNow` endpoint 
- Added frontend Buy Now button and Razorpay modal
- Fixed receipt generation

**Status**: 🔄 NEEDS TESTING

---

#### 4.2 Verify Buy It NowPayment
**Endpoint**: `POST /auctions/:auctionId/verify-buy-now-payment`

**Request Body**:
```json
{
  "razorpay_payment_id": "pay_...",
  "razorpay_order_id": "order_...",
  "razorpay_signature": "signature..."
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Item purchased successfully",
  "auction": {
    "_id": "...",
    "status": "ENDED",
    "currentWinner": "...",
    "winningBid": 80000
  }
}
```

**Test Cases**:
- ✓ Valid Razorpay signature accepted
- ✓ Invalid signature rejected with 400
- ✓ Auction status set to ENDED immediately
- ✓ currentWinner set to buyer
- ✓ winningBid set to BIN amount
- ✓ Payment record created with type = "BUY_IT_NOW_PAYMENT"
- ✓ Cannot buy-now if registration already started
- ✓ Auction log created with BUY_NOW event
- ✓ Admin notification sent
- ✓ Cannot verify same payment twice

**Recent Changes**: Added `handleVerifyBuyNowPayment` endpoint

**Status**: 🔄 NEEDS TESTING

---

### Section E: Auction Lifecycle APIs

#### 5.1 Auction Status Transitions
**Automatic Transitions** (handled by `auction.completion.service.js`):

**1. UPCOMING → LIVE** 
- Condition: current time ≥ startTime AND registrations.length ≥ 1
- Action: status = "LIVE", log created, socket emitted
- Test: ✓ RECENTLY ADDED

**2. UPCOMING → CANCELLED**
- Condition: current time ≥ startTime AND registrations.length = 0
- Action: status = "CANCELLED", auction closed
- Test: ✓ Should show "Auction Cancelled" in frontend countdown ✓ RECENTLY FIXED

**3. LIVE → ENDED**
- Condition: current time ≥ endTime
- Action: status = "ENDED", winner determined
- Test: Need to test

**Test Cases**:
- ✓ Transitions happen automatically every 10 seconds via cron job
- ✓ Auction cannot go LIVE without registrations
- ✓ Auction goes LIVE when first registration verified
- ✓ LIVE auctions shown correctly in UI
- ✓ CANCELLED auctions show "Auction Cancelled" instead of timer ✓ RECENTLY FIXED
- ✓ Countdown only shows for UPCOMING and LIVE auctions

**Recent Changes**:
- Added UPCOMING → LIVE transition logic
- Fixed countdown display for CANCELLED auctions

**Status**: 🔄 NEEDS TESTING

---

#### 5.2 Cancel Auction (Manual)
**Endpoint**: `POST /auctions/:auctionId/cancel`

**Test Cases**:
- ✓ Only creator can cancel
- ✓ Only UPCOMING auctions can be cancelled manually
- ✓ Refund registration fees if applicable
- ✓ Notify all registered users
- ✓ Status set to CANCELLED
- ✓ Countdown shows "Auction Cancelled"

**Status**: 🔄 NEEDS TESTING

---

### Section F: Leaderboard APIs

#### 6.1 Get Leaderboard
**Endpoint**: `GET /auctions/:auctionId/leaderboard`

**Test Cases**:
- ✓ Returns top bidders
- ✓ Sorted by highest bid amount desc
- ✓ Returns user name, rank, previous bid count
- ✓ `leaderboard-update` websocket payload mirrors displayed ordering

**Status**: 🔄 NEEDS TESTING

---

### Section G: Admin APIs

#### 7.1 Admin Dashboard Stats
**Endpoint**: `GET /admin/stats`

**Test Cases**:
- ✓ Only admins can access
- ✓ Returns total users, auctions, bids, revenue
- ✓ Breakdown by auction status

**Status**: 🔄 NEEDS TESTING

---

## 3. FRONTEND FEATURE TESTING CHECKLIST

### Core Flow Tests

#### Test 1: Complete Auction Lifecycle
- [ ] Create auction as seller
- [ ] See "UPCOMING" status
- [ ] See countdown properly displayed
- [ ] See Buy Now button (visible before registration starts)
- [ ] Click Buy Now, pay with test card, verify auction ends

#### Test 2: Registration & Bidding Flow
- [ ] Create auction as seller (registration in 2 min)
- [ ] Login as buyer
- [ ] Click "Register" button during registration window
- [ ] Complete Razorpay payment
- [ ] After payment, verify registration successful
- [ ] See "Manual Bid" form becomes available
- [ ] Place manual bid > minimum
- [ ] Verify bid updates in real-time
- [ ] See countdown timer working

#### Test 3: Auto-Bid Pre-Auction Setup
- [ ] Create auction with 3-min registration window
- [ ] Login as buyer during registration window
- [ ] Verify AUTO-BID form shows BEFORE registering
- [ ] Click AUTO-BID tab
- [ ] Verify message "You must register in this auction first"
- [ ] Register for auction
- [ ] Verify AUTO-BID form still available
- [ ] Set auto-bid max limit
- [ ] Close auction or wait for LIVE
- [ ] Verify auto-bid triggers when other bids placed

#### Test 4: Live Auto-Bid Bidding
- [ ] Auction transitions to LIVE (2+ registered)
- [ ] Manual bid placed by user 1
- [ ] User 2 has auto-bid set
- [ ] Verify auto-bid triggers automatically
- [ ] Compare winning bid against auto-bid max limit
- [ ] If auto-bid max exceeded, verify outbid email sent ✓ NEEDS EMAIL TEST

#### Test 5: Email Verification Recovery Flow
- [ ] Create new account with email: test@example.com
- [ ] Close verification window without verifying
- [ ] Try to login with test@example.com
- [ ] Verify gets message "Email not verified"
- [ ] Verify "Verify email now" button appears
- [ ] Click button, navigate to verify page
- [ ] Click "Resend Code" button
- [ ] Check email for new verification code
- [ ] Enter code, verify email successfully
- [ ] Login now works

#### Test 6: Multiple Auction Participation
- [ ] Create 3 auctions as seller
- [ ] Register in all 3 as buyer through payment
- [ ] Set auto-bid in all 3
- [ ] Place manual bid in one
- [ ] Deactivate auto-bid in one
- [ ] Buy-now in auction that's still UPCOMING
- [ ] Verify all statuses update correctly

#### Test 7: Auction Cancellation Display
- [ ] Create auction
- [ ] Cancel from admin/backend
- [ ] Refresh page
- [ ] Verify "Auction Cancelled" shown in countdown area
- [ ] Verify no countdowntimer displayed
- [ ] Verify registration/bid buttons disabled

---

## 4. BUG FIXES TO VERIFY

### Recently Fixed Issues

| Bug | Status | Test Strategy |
|-----|--------|----------------|
| Redlock crashes bidding | ✅ FIXED | Run bidding API tests |
| Registration returns 400 | ✅ FIXED | Test registration payment flow |
| Buy It Now not working | ✅ FIXED | Test buy-now order + verify payment |
| Autobid not visible | ✅ FIXED | Test during UPCOMING + LIVE |
| Cancelled auction shows timer | ✅ FIXED | Cancel auction, verify countdown |
| Unverified email users stuck | ✅ FIXED | Test resend code + verify path |

---

## 5. TESTING EXECUTION PLAN

### Phase 1: API Unit Testing (Start Here)
**Duration**: 1-2 hours  
**Process**: Test each API endpoint individually with cURL or Postman

1. Start backend: `npm run dev`
2. Test auth endpoints (register, login, verify, resend)
3. Test auction endpoints (create, list, details)
4. Test bidding endpoints (place bid, autobid)
5. Test buy-now endpoints
6. Document any failures

### Phase 2: Integration Testing
**Duration**: 2-3 hours  
**Process**: Test complete workflows

1. User creation → email verification → login
2. Auction creation → registration → bidding → ended
3. Buy-now complete flow
4. Auto-bid setup → trigger → outbid
5. Multiple users competing
6. Auction cancellation

### Phase 3: Frontend UI Testing
**Duration**: 2-3 hours  
**Process**: Test UI against actual scenarios

1. Create test auctions with different timing windows
2. Execute all flows from user perspective
3. Verify visuals (buttons, messages, timers)
4. Check responsiveness and error handling
5. Test socket.IO real-time updates
6. Test email notifications

### Phase 4: Edge Case Testing
**Duration**: 1-2 hours  
**Process**: Stress test and verify error handling

1. Rapid bidding (race conditions)
2. Bid placed in last seconds (auction extension)
3. Multiple auto-bids competing
4. Invalid payments/signatures
5. Auction state changes mid-action
6. Network disconnections/Socket.IO reconnection

---

## 6. TESTING CHECKLIST TEMPLATE

Use this for each test:

```
Test Name: _______________
Endpoint(s): ______________
Test Date: ________________
Tester: ___________________

Setup:
[ ] Database cleared/ready
[ ] Backend running
[ ] Test accounts logged in
[ ] Test data created

Execution:
[ ] Step 1: _______________
[ ] Step 2: _______________
[ ] Step 3: _______________

Expected:
[ ] Result A
[ ] Result B
[ ] Result C

Actual:
[ ] Result A
[ ] Result B
[ ] Result C

Status: PASS / FAIL

Notes: ____________________
```

---

## 7. KNOWN ISSUES TO TRACK

| Issue | Current Status | Fix Needed |
|-------|----------------|-----------|
| Email notifications in test mode | ⏳ Pending | Check .env EMAIL configuration |
| Socket.IO connectivity | ⏳ Pending | Test real-time updates |
| Mobile responsiveness | ⏳ Pending | Test on mobile browsers |
| Rate limiting | ⏳ Not Implemented | Implement if needed |

---

## 8. PRODUCTION READINESS CHECKLIST

Before deploying to production:

- [ ] All API endpoints tested individually
- [ ] All integration workflows tested end-to-end
- [ ] No console errors in backend
- [ ] No console errors in frontend
- [ ] All Razorpay test payments verified
- [ ] Email notifications working (if implemented)
- [ ] Socket.IO real-time updates working
- [ ] Database backups configured
- [ ] Error logging configured
- [ ] Performance tested under load
- [ ] Security review completed
- [ ] CORS configuration reviewed
- [ ] .env file secure (all secrets present)
- [ ] MongoDB indexes optimized
- [ ] Redis connection stable
- [ ] API response times < 500ms
- [ ] Payments fully automated and reliable

---

**Next Steps**: Start with Phase 1 API Unit Testing. Run each endpoint and document results above.