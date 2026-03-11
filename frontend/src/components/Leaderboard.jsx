import { useEffect, useRef, useState } from 'react'
import { Trophy, Medal, ArrowUp, ArrowDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Leaderboard({ auctionId, leaderboard }) {
  const navigate = useNavigate()
  const prevRanksRef = useRef({})
  const prevBidAmountRef = useRef({})
  const [rowAnimation, setRowAnimation] = useState({})

  useEffect(() => {
    const nextAnimation = {}
    const nextRanks = {}
    const nextBidAmounts = {}

    leaderboard.forEach((bidder) => {
      const userId = String(bidder.userId)
      const previousRank = prevRanksRef.current[userId]
      const previousBidAmount = prevBidAmountRef.current[userId]

      nextRanks[userId] = bidder.rank
      nextBidAmounts[userId] = bidder.bidAmount

      if (typeof previousRank === 'number') {
        if (bidder.rank < previousRank) {
          nextAnimation[userId] = 'leaderboard-row-up'
        } else if (bidder.rank > previousRank) {
          nextAnimation[userId] = 'leaderboard-row-down'
        }
      } else {
        nextAnimation[userId] = 'leaderboard-row-enter'
      }

      if (typeof previousBidAmount === 'number' && bidder.bidAmount !== previousBidAmount) {
        nextAnimation[`${userId}:amount`] = 'leaderboard-amount-bump'
      }
    })

    setRowAnimation(nextAnimation)
    prevRanksRef.current = nextRanks
    prevBidAmountRef.current = nextBidAmounts

    const timer = setTimeout(() => setRowAnimation({}), 900)
    return () => clearTimeout(timer)
  }, [leaderboard])

  const getMedalIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-400" />
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-8 h-8 text-accent-500" />
        <h2 className="text-2xl font-bold text-gray-900">Top Bidders</h2>
      </div>

      {leaderboard.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Rank</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Bidder</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Bid Amount</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((bidder) => (
                <tr
                  key={bidder.userId}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    bidder.isCurrentWinner ? 'bg-primary-50' : ''
                  } ${rowAnimation[String(bidder.userId)] || ''}`}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {getMedalIcon(bidder.rank)}
                      <span className="font-bold text-lg text-gray-900">#{bidder.rank}</span>
                      {rowAnimation[String(bidder.userId)] === 'leaderboard-row-up' && (
                        <ArrowUp className="w-4 h-4 text-success-600" />
                      )}
                      {rowAnimation[String(bidder.userId)] === 'leaderboard-row-down' && (
                        <ArrowDown className="w-4 h-4 text-danger-600" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${bidder.userId}`)}
                        className="font-semibold text-gray-900 hover:text-primary-600 hover:underline"
                      >
                        {bidder.userName}
                      </button>
                      <p className="text-sm text-gray-500">{bidder.previousBids} previous bid{bidder.previousBids !== 1 ? 's' : ''}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className={`font-bold text-lg text-primary-600 ${rowAnimation[`${String(bidder.userId)}:amount`] || ''}`}>
                      ₹{bidder.bidAmount.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {bidder.isCurrentWinner ? (
                      <span className="badge badge-success">Leading</span>
                    ) : (
                      <span className="text-sm text-gray-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No bids yet. Be the first to bid!</p>
        </div>
      )}
    </div>
  )
}