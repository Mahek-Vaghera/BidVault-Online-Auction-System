import { Link } from 'react-router-dom'
import { Clock, Eye, Gavel, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function AuctionCard({ auction }) {
  const getStatusColor = (status) => {
    const colors = {
      'LIVE': 'badge-warning',
      'UPCOMING': 'badge-info',
      'COMPLETED': 'badge-success',
      'ENDED': 'badge-success',
      'CANCELLED': 'badge-danger'
    }
    return colors[status] || 'badge'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'LIVE': '🔴 LIVE',
      'UPCOMING': '⏳ Coming Soon',
      'COMPLETED': '✅ Completed',
      'ENDED': '✅ Completed',
      'CANCELLED': '❌ Cancelled'
    }
    return labels[status] || status
  }

  const timeRemaining = () => {
    if (auction.status === 'COMPLETED' || auction.status === 'ENDED' || auction.status === 'CANCELLED') {
      return 'View results'
    }
    if (auction.status === 'UPCOMING') {
      return `Starts in ${formatDistanceToNow(new Date(auction.startTime))}`
    }
    return `Ends in ${formatDistanceToNow(new Date(auction.endTime))}`
  }

  return (
    <Link to={`/auction/${auction._id}`}>
      <div className="card group cursor-pointer h-full flex flex-col">
        {/* Product Image */}
        <div className="relative overflow-hidden rounded-lg mb-4 bg-gray-100 h-48">
          <img
            src={auction.product?.images?.[0] || 'https://via.placeholder.com/300x200'}
            alt={auction.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute top-3 right-3">
            <span className={`badge ${getStatusColor(auction.status)}`}>
              {getStatusLabel(auction.status)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
            {auction.title}
          </h3>

          {/* Category */}
          <p className="text-sm text-gray-500 mb-4">
            {auction.product?.category || 'Uncategorized'}
          </p>

          {/* Price Section */}
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-600 uppercase tracking-wider">Current Bid</p>
            <p className="text-2xl font-bold">
              ₹{(auction.currentBid || auction.startingPrice).toLocaleString()}
            </p>
            {auction.currentBid > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                {auction.totalBids} bid{auction.totalBids !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Info Row */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Gavel className="w-4 h-4" />
              <span>₹{auction.minIncrement.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>Min: ₹{auction.startingPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Time Remaining */}
          <div className="flex items-center gap-2 text-primary-600 font-semibold mt-auto">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{timeRemaining()}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}