# BidVault Frontend

A modern, responsive React frontend for the BidVault online auction platform with real-time bidding using Socket.IO.

## Features

- 🔐 User authentication (Login/Register)
- 🏷️ Auction marketplace with filtering
- 🔴 Real-time bidding with Socket.IO
- 🤖 Automated bidding system
- 🏆 Live leaderboard with top bidders
- 📱 Fully responsive design
- 🎨 Modern UI with Tailwind CSS
- ⚡ Fast performance with Vite

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **Zustand** - State management
- **Lucide React** - Icons
- **date-fns** - Date utilities

## Project Structure

```
src/
├── assets/           # Images and static files
├── components/       # Reusable components
│   ├── AuctionCard.jsx
│   ├── BidForm.jsx
│   ├── Leaderboard.jsx
│   └── Layout.jsx
├── pages/            # Page components
│   ├── Dashboard.jsx
│   ├── AuctionDetail.jsx
│   ├── CreateAuction.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   └── Profile.jsx
├── services/         # API and utilities
│   ├── api.js        # API endpoints
│   └── socket.js     # Socket.IO client
├── store/            # Zustand stores
│   └── index.js
├── App.jsx           # Root component
├── main.jsx          # Entry point
└── index.css         # Global styles
```

## Installation

### Prerequisites
- Node.js 16+ installed
- Backend server running on http://localhost:5000

### Setup Steps

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Create environment variables** (if needed):
```bash
# .env file (optional)
REACT_APP_API_URL=http://localhost:5000/bidvault
REACT_APP_SOCKET_URL=http://localhost:5000
```

3. **Start development server:**
```bash
npm run dev
```

4. **Build for production:**
```bash
npm run build
```

5. **Preview production build:**
```bash
npm npm preview
```

## Usage

### Authentication Flow
1. User registers with email, username, and password
2. System validates and creates account
3. User logs in with credentials
4. JWT token is stored in cookies

### Auction Browsing
- Dashboard displays all auctions with status filters
- Auctions can be filtered by: ALL, UPCOMING, LIVE, ENDED, CANCELLED
- Click on auction card to view details

### Bidding
- **Manual Bidding**: Place individual bids
  - Minimum bid must be current bid + minimum increment
  - Real-time updates via Socket.IO

- **Auto-Bidding**: Set maximum limit
  - System automatically bids when outbid
  - Stops when max limit is exceeded
  - Email notification when outbid

### Real-Time Features
- Live bid updates across all connected users
- Auction extension notifications (bid in last 2 minutes extends by 10 minutes)
- Live leaderboard with top 10 bidders
- Auction completion announcements

### Leaderboard
- Shows top 10 bidders sorted by bid amount
- Displays bidder rank, bid amount, and bid count
- Real-time updates during auction

## Color Psychology

The platform uses a carefully chosen color scheme:

- **Primary (Deep Blue #0284c7)**: Trust, stability, professional
- **Accent (Golden Orange #f97316)**: Excitement, urgency, action
- **Success (Green #22c55e)**: Positive outcomes, wins
- **Danger (Red #ef4444)**: Alerts, outbid notifications

This combination creates psychological triggers that encourage user engagement while maintaining trust in the auction platform.

## API Integration

The frontend connects to the backend API with these main endpoints:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout

### Auctions
- `GET /auctions` - List auctions with filters
- `GET /auctions/:id` - Get auction details
- `POST /auctions/create` - Create new auction
- `PATCH /auctions/:id` - Update auction

### Bidding
- `POST /auctions/:id/bid` - Place manual bid
- `POST /auctions/:id/autobid` - Set auto-bid
- `PATCH /auctions/:id/autobid/:bidId` - Edit auto-bid
- `POST /auctions/:id/autobid/:bidId/activate` - Activate auto-bid
- `POST /auctions/:id/autobid/:bidId/deactivate` - Deactivate auto-bid

### Leaderboard
- `GET /auctions/:id/leaderboard` - Get top 10 bidders
- `GET /auctions/:id/history` - Get bidding history
- `GET /auctions/:id/my-bid` - Get user's bid details

## Socket.IO Events

### Events Received
- `bid-update` - New bid placed
- `auction-extended` - Auction extended by 10 minutes
- `auction-ended` - Auction has ended with winner
- `leaderboard-update` - Leaderboard updated

### Events Sent
- `join-auction` - Join an auction room
- `leave-auction` - Leave an auction room

## State Management

Using Zustand for state management:

```javascript
// Auth Store
useAuthStore() - user, isLoggedIn, setUser, logout

// Auction Store
useAuctionStore() - auctions, currentAuction, leaderboard, bidHistory

// Bid Store
useBidStore() - userBid, autobids
```

## Responsive Design

The frontend is fully responsive:
- **Mobile** (320px+): Single column layout
- **Tablet** (768px+): Two column layout
- **Desktop** (1024px+): Three column layout with sidebar

## Performance Optimizations

1. **Code Splitting**: Lazy load pages
2. **Image Optimization**: Placeholder images, lazy loading
3. **State Management**: Minimal re-renders with Zustand
4. **Caching**: Socket.IO adapter for Redis caching
5. **Bundle Size**: Tree-shaking with Vite

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development Tips

1. **Debug Mode**: Open browser DevTools to see network requests
2. **Real-time Testing**: Open multiple browser tabs to test Socket.IO
3. **Local Storage**: Check browser dev tools for stored auth tokens
4. **Component Reusability**: Check `components/` for reusable components

## Troubleshooting

### Socket.IO Connection Issues
- Ensure backend is running on port 5000
- Check CORS settings in backend
- Verify WebSocket connections in browser DevTools

### API 404 Errors
- Verify backend API endpoints match
- Check base URL in `services/api.js`
- Ensure MONGO_URI is set in backend

### CSS Not Loading
- Clear browser cache
- Run `npm run build` for production
- Check Tailwind CSS configuration

## Deployment

Build for production:
```bash
npm run build
```

This creates an optimized production bundle in `dist/` folder.

### Deploy to popular platforms:

**Vercel**:
```bash
npm i -g vercel
vercel
```

**Netlify**:
```bash
npm run build
netlify deploy --prod --dir=dist
```

## Contributing

Please follow these conventions:
- Use functional components with hooks
- Use absolute imports from `src/`
- Follow Tailwind CSS naming conventions
- Create reusable components in `components/`

## License

MIT License