import { useState, useEffect, useMemo } from 'react'
import { bidAPI } from '../services/api'
import { Gavel, Target, AlertCircle, CheckCircle } from 'lucide-react'

export default function BidForm({ auctionId, auction, onBidSuccess }) {
  const [bidAmount, setBidAmount] = useState('')
  const [autobidMode, setAutobidMode] = useState(false)
  const [maxLimit, setMaxLimit] = useState('')
  const [editLimit, setEditLimit] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [myAutobid, setMyAutobid] = useState(null)

  const minNextBid = useMemo(() => {
    if (!auction) return 0
    return auction.currentBid > 0
      ? Number(auction.currentBid) + Number(auction.minIncrement)
      : Number(auction.startingPrice)
  }, [auction])

  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [message])

  useEffect(() => {
    const fetchAutobid = async () => {
      try {
        const autobidResponse = await bidAPI.getMyAutobid(auctionId).catch(() => null)
        const autobid = autobidResponse?.data?.data?.autobid || null
        setMyAutobid(autobid)
        if (autobid?.maxLimit) {
          setEditLimit(String(autobid.maxLimit))
        }
      } catch (error) {
        console.error('Failed to fetch autobid', error)
      }
    }

    fetchAutobid()
  }, [auctionId])

  useEffect(() => {
    if (!auction || !minNextBid) return

    setBidAmount(String(minNextBid))

    setMaxLimit((prev) => {
      if (!prev) return String(minNextBid)
      return Number(prev) < Number(minNextBid) ? String(minNextBid) : prev
    })

    setEditLimit((prev) => {
      if (!prev) return prev
      return Number(prev) < Number(minNextBid) ? String(minNextBid) : prev
    })
  }, [auction, minNextBid])

  const handleManualBid = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await bidAPI.placeBid(auctionId, Number(bidAmount))
      if (response.data.success) {
        setMessage('Bid placed successfully!')
        setMessageType('success')
        setBidAmount(String(minNextBid))
        onBidSuccess()
      }
    } catch (error) {
      const apiMessage = error.response?.data?.message || 'Failed to place bid'
      if (apiMessage.toLowerCase().includes('active auto-bid')) {
        setMessage('You have activated Auto-Bid. Please deactivate Auto-Bid first to place a manual bid.')
      } else {
        setMessage(apiMessage)
      }
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleAutobid = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await bidAPI.setAutobid(auctionId, Number(maxLimit))
      if (response.data.success) {
        setMessage('Auto-bid set successfully!')
        setMessageType('success')
        const autobid = response.data?.data?.autobid || null
        setMyAutobid(autobid)
        setEditLimit(String(autobid?.maxLimit || maxLimit))
        onBidSuccess()
      }
    } catch (error) {
      const apiMessage = error.response?.data?.message || 'Failed to set auto-bid'
      if (error.response?.status === 403) {
        setMessage('Please register in this auction first, then set Auto-Bid.')
      } else {
        setMessage(apiMessage)
      }
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleEditAutobid = async (e) => {
    e.preventDefault()
    if (!myAutobid?._id) return

    setLoading(true)
    setMessage('')
    try {
      const response = await bidAPI.editAutobid(auctionId, myAutobid._id, Number(editLimit))
      if (response.data.success) {
        setMyAutobid(response.data?.data?.autobid || myAutobid)
        setMessage('Auto-bid limit updated successfully!')
        setMessageType('success')
        onBidSuccess()
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to edit auto-bid')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAutobid = async (activate) => {
    if (!myAutobid?._id) return

    setLoading(true)
    setMessage('')
    try {
      const response = activate
        ? await bidAPI.activateAutobid(auctionId, myAutobid._id)
        : await bidAPI.deactivateAutobid(auctionId, myAutobid._id)

      if (response.data.success) {
        const updated = response.data?.data?.autobid || { ...myAutobid, isActive: activate }
        setMyAutobid(updated)
        setMessage(activate ? 'Auto-bid activated successfully!' : 'Auto-bid deactivated successfully!')
        setMessageType('success')
        onBidSuccess()
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update auto-bid status')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  if (!auction) return null

  const isLive = auction.status === 'LIVE'
  const showAutobidOnly = auction.status === 'UPCOMING'

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      {message && (
        <div className={`p-4 rounded-lg flex gap-3 ${
          messageType === 'success'
            ? 'bg-success-50 text-success-600 border border-success-200'
            : 'bg-danger-50 text-danger-600 border border-danger-200'
        }`}>
          {messageType === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{message}</p>
        </div>
      )}

      {myAutobid && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Your Auto-Bid</p>
          <p className="text-sm text-gray-700">Max Limit: <span className="font-semibold">₹{Number(myAutobid.maxLimit || 0).toLocaleString()}</span></p>
          <p className={`text-sm font-semibold ${myAutobid.isActive ? 'text-success-600' : 'text-danger-600'}`}>
            Status: {myAutobid.isActive ? 'Active' : 'Inactive'}
          </p>

          <form onSubmit={handleEditAutobid} className="flex gap-2">
            <input
              type="number"
              min={minNextBid}
              step={auction.minIncrement}
              value={editLimit}
              onChange={(e) => setEditLimit(e.target.value)}
              className="input-field"
              disabled={loading}
              required
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50"
              disabled={loading || !editLimit}
            >
              Edit
            </button>
          </form>

          <button
            type="button"
            onClick={() => handleToggleAutobid(!myAutobid.isActive)}
            className={`w-full py-2 rounded-lg font-semibold ${myAutobid.isActive ? 'bg-danger-600 text-white hover:bg-danger-700' : 'bg-success-600 text-white hover:bg-success-700'} disabled:opacity-50`}
            disabled={loading}
          >
            {myAutobid.isActive ? 'Deactivate Auto-Bid' : 'Activate Auto-Bid'}
          </button>
        </div>
      )}

      {!showAutobidOnly && (
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setAutobidMode(false)}
            className={`px-4 py-2 font-semibold transition-colors ${
              !autobidMode
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Gavel className="w-4 h-4 inline mr-2" />
            Manual Bid
          </button>
          <button
            onClick={() => setAutobidMode(true)}
            className={`px-4 py-2 font-semibold transition-colors ${
              autobidMode
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Auto Bid
          </button>
        </div>
      )}

      {showAutobidOnly && (
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 text-sm text-accent-700">
          Auction has not started yet. You can set Auto-Bid now and it will bid automatically when auction goes LIVE.
        </div>
      )}

      {!autobidMode && !showAutobidOnly ? (
        <form onSubmit={handleManualBid} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Bid Amount (Minimum: ₹{minNextBid.toLocaleString()})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-600 font-semibold">₹</span>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min={minNextBid}
                step={auction.minIncrement}
                className="input-field pl-8"
                required
                disabled={loading}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Current bid is ₹{auction.currentBid?.toLocaleString() || auction.startingPrice.toLocaleString()}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !bidAmount || !isLive}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Gavel className="w-5 h-5" />
            {loading ? 'Placing Bid...' : 'Place Bid'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleAutobid} className="space-y-4">
          <div className="bg-primary-50 rounded-lg p-4 text-sm text-primary-700">
            <p className="font-semibold mb-2">How Auto-Bid Works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Set your maximum bid limit</li>
              <li>System automatically bids for you</li>
              <li>Only bids when someone outbids you</li>
              <li>Stops if limit is exceeded</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Maximum Bid Limit (Minimum: ₹{minNextBid.toLocaleString()})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-600 font-semibold">₹</span>
              <input
                type="number"
                value={maxLimit}
                onChange={(e) => setMaxLimit(e.target.value)}
                min={minNextBid}
                step={auction.minIncrement}
                className="input-field pl-8"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !maxLimit}
            className="btn-accent w-full flex items-center justify-center gap-2"
          >
            <Target className="w-5 h-5" />
            {loading ? 'Setting Auto-Bid...' : 'Set Auto-Bid'}
          </button>
        </form>
      )}
    </div>
  )
}