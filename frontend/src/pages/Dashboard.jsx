import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, DollarSign, Users, TrendingUp, Filter } from 'lucide-react'
import { auctionAPI } from '../services/api'
import { useAuctionStore } from '../store'
import AuctionCard from '../components/AuctionCard'

export default function Dashboard() {
  const [auctions, setAuctions] = useState([])
  const [statsAuctions, setStatsAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStatsAuctions()
  }, [])

  useEffect(() => {
    fetchAuctions()
  }, [filter])

  const fetchStatsAuctions = async () => {
    try {
      const response = await auctionAPI.list(null)
      if (response.data.success) {
        setStatsAuctions(response.data.auctions || [])
      }
    } catch (err) {
      // Keep existing stats if refresh fails.
    }
  }

  const fetchAuctions = async () => {
    setLoading(true)
    setError('')
    try {
      const status = filter === 'ALL' ? null : filter
      const response = await auctionAPI.list(status)
      if (response.data.success) {
        setAuctions(response.data.auctions || [])
      }
    } catch (err) {
      setError('Failed to fetch auctions. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    {
      label: 'Active Auctions',
      value: statsAuctions.filter(a => a.status === 'LIVE').length,
      icon: TrendingUp,
      color: 'primary'
    },
    {
      label: 'Upcoming',
      value: statsAuctions.filter(a => a.status === 'UPCOMING').length,
      icon: Clock,
      color: 'accent'
    },
    {
      label: 'Completed',
      value: statsAuctions.filter(a => a.status === 'COMPLETED' || a.status === 'ENDED').length,
      icon: DollarSign,
      color: 'success'
    },
    {
      label: 'Total Bids',
      value: statsAuctions.reduce((sum, a) => sum + (a.totalBids || 0), 0),
      icon: Users,
      color: 'accent'
    }
  ]

  const filterOptions = ['ALL', 'UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Auction Marketplace</h1>
          <p className="text-primary-100 text-lg">Find and bid on amazing items in real-time</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            const colorClass = {
              primary: 'from-primary-50 to-primary-100 text-primary-600',
              accent: 'from-accent-50 to-accent-100 text-accent-600',
              success: 'from-success-50 to-success-100 text-success-600'
            }[stat.color]

            return (
              <div
                key={idx}
                className={`bg-gradient-to-br ${colorClass} rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-75">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <Icon className="w-12 h-12 opacity-30" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center gap-4 overflow-x-auto pb-4">
            <Filter className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <div className="flex gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setFilter(option)}
                  className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    filter === option
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Create Auction Button */}
        <div className="mb-8 text-center">
          <Link
            to="/create-auction"
            className="inline-block px-8 py-3 bg-gradient-to-r from-primary-600 to-accent-500 text-white rounded-xl font-semibold hover:shadow-lg transition-shadow"
          >
            + Create New Auction
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-600">
            {error}
          </div>
        )}

        {/* Auctions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-md h-80 animate-pulse" />
            ))}
          </div>
        ) : auctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <AuctionCard key={auction._id} auction={auction} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 mb-4">No auctions found</p>
            <p className="text-gray-500">Try adjusting your filters or create a new auction</p>
          </div>
        )}
      </div>
    </div>
  )
}