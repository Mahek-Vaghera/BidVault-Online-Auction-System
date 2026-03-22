# BidVault – Online Auction System

BidVault is a full-stack, real-time online auction platform designed to handle high-concurrency bidding, automated bidding logic, admin-controlled auction verification, and secure online payments. The system clearly separates user and admin responsibilities to maintain fairness, transparency, and platform integrity.

---

## System Overview

BidVault operates on a controlled auction lifecycle where:
- Users create and participate in auctions.
- Admin verifies auctions, payments, and platform compliance.
- All bidding is real-time, validated, and concurrency-safe.
- Payments and commissions are handled securely.

---

## User Dashboard Flow

### 1. Registration & Authentication
- User registers using email.
- OTP is sent for email verification.
- Account activates only after OTP verification.
- User logs in and gains access to dashboard.

---

### 2. Auction Discovery
From the dashboard, the user can:
- Browse auctions by category:
  - Upcoming
  - Live
  - Ended
  - Cancelled
- Search auctions by keyword.
- Sort and filter auctions by price, time, and category.

---

### 3. Auction Creation (Seller Flow)
User can create an auction by providing:
- Product images
- Item condition (new, used, etc.)
- Starting price
- Minimum bidding amount
- Minimum bid increment
- Reserved price
- Buy It Now price (optional)
- Registration start & end time
- Bidding start & end time

**Status:**  
Auction remains inactive until admin approval.

---

### 4. Auction Participation (Buyer Flow)
- User registers for an auction by paying a token fee.
- Only registered users can place bids.
- Buy It Now option is available only before auction registration starts.

---

### 5. Bidding

#### Manual Bidding
- Bid must be at least the current highest bid plus the minimum bid increment.

#### Auto-Bidding
- User sets a maximum bid limit.
- System automatically places bids based on minimum increment.
- Auto-bid stops if another bidder exceeds the max limit.
- User receives an email notification if outbid.
- User can view, edit, activate, and deactivate existing auto-bid from auction detail.
- Manual bidding is blocked while user's auto-bid is active (with clear UI message).

---

### 6. Auction Extension
- If a bid is placed within the last 2 minutes:
- Auction extends by 10 minutes.
- Prevents unfair last-second bidding.

---

### 7. Auction Completion & Payment
- Highest bidder wins when auction ends.
- Winner receives email notification.
- Winner can pay winning amount directly from auction detail using Razorpay.
- Buy It Now payment and winning payment status are reflected in auction API response.
- Profile recent activity includes successful wins from Buy It Now and winning payment.

---

## Realtime Behavior

- `bid-update` broadcasts current bid/winner updates to all clients in the auction room.
- `leaderboard-update` broadcasts top bidders whenever manual or auto-bids change standings.
- Winner and leading-bidder names are normalized (`fullname`, fallback `username`, fallback `email`) and link to user profile.

If winner pays:
- Admin verifies payment.
- Commission deducted.
- Auction closed.

If winner fails to pay:
- Next highest bidder is notified.
- Admin approval required to proceed.

---

## Admin Dashboard Flow

### 1. Auction Management
Admin can:
- Approve or reject auction creation requests.
- Cancel auctions if violations occur.
- Monitor live, upcoming, and ended auctions.

---

### 2. Bidding & Auction Monitoring
- View real-time bidding activity.
- Ensure bidding rules and increments are followed.
- Monitor auction extensions.

---

### 3. Payment & Revenue Control
Admin can:
- Verify winner payments.
- Track token fees.
- Deduct commission from winning amount.
- View platform revenue analytics.

---

### 4. Winner & Delivery Control
- Confirm final winner after payment.
- Enable delivery workflow (future module).
- Handle disputes or payment failures.

---

## Revenue Model

Admin earns through:
- Token fees paid during auction registration.
- Commission percentage from final winning bid.

---

## Real-Time & Concurrency Design

- Socket.IO handles live bid updates.
- Redis stores active auction data.
- Redis-Lock ensures:
  - No simultaneous bid placement
  - Atomic bid execution
  - Data consistency under high load

---

## Security & Validation

- Email OTP verification
- Razorpay payment signature verification
- Server-side bid validation
- Redis-based concurrency locks
- Secure environment variables
- Input sanitization

---

**Code. Create. Empower.**