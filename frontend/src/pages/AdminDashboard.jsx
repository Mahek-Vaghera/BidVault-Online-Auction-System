import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../services/api'
import { ShieldCheck, Radio, Truck, CreditCard, CheckCircle2, Clock3, Wallet, LayoutList } from 'lucide-react'

const deliveryStatuses = [
  'CREATED',
  'ADMIN_APROVED',
  'ADMIN_APPROVED',
  'ITEM_PICKED',
  'PACKAGING_DONE',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('auctions')
  const [overview, setOverview] = useState(null)
  const [pendingAuctions, setPendingAuctions] = useState([])
  const [liveAuctions, setLiveAuctions] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [payments, setPayments] = useState([])
  const [deliveryDrafts, setDeliveryDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [paymentCategory, setPaymentCategory] = useState('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL')
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('ALL')
  const [selectedAuctionDetail, setSelectedAuctionDetail] = useState(null)

  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [message])

  const formatAddress = (address) => {
    if (!address) return 'Not provided'
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.pincode,
      address.country,
    ].filter(Boolean)
    return parts.length ? parts.join(', ') : 'Not provided'
  }

  const loadDashboard = async () => {
    try {
      const [overviewRes, auctionsRes, liveRes, deliveriesRes, paymentsRes] = await Promise.all([
        adminAPI.overview(),
        adminAPI.getPendingAuctions(),
        adminAPI.getLiveAuctions(),
        adminAPI.getDeliveries(),
        adminAPI.getPayments(),
      ])

      if (overviewRes.data.success) setOverview(overviewRes.data.stats)
      if (auctionsRes.data.success) setPendingAuctions(auctionsRes.data.auctions || [])
      if (liveRes.data.success) setLiveAuctions(liveRes.data.auctions || [])
      if (deliveriesRes.data.success) {
        const nextDeliveries = deliveriesRes.data.deliveries || []
        setDeliveries(nextDeliveries)
        setDeliveryDrafts((prev) => {
          const draft = { ...prev }
          nextDeliveries.forEach((delivery) => {
            const key = String(delivery._id)
            if (!draft[key]) {
              draft[key] = { status: delivery.status, note: '' }
            }
          })
          return draft
        })
      }
      if (paymentsRes.data.success) setPayments(paymentsRes.data.payments || [])
    } catch (error) {
      const status = error.response?.status
      if (status === 401 || status === 403) {
        localStorage.removeItem('adminToken')
        navigate('/admin/login')
        return
      }
      setMessage(error.response?.data?.message || 'Failed to load admin dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      navigate('/admin/login')
      return
    }
    loadDashboard()
  }, [])

  const verifyAuction = async (auctionId, verified) => {
    try {
      const response = await adminAPI.verifyAuction(auctionId, verified)
      if (response.data.success) {
        setMessage(response.data.message)
        await loadDashboard()
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update auction verification')
    }
  }

  const updateDeliveryStatus = async (deliveryId) => {
    const draft = deliveryDrafts[String(deliveryId)]
    if (!draft?.status) {
      setMessage('Please select a delivery status')
      return
    }

    try {
      const response = await adminAPI.updateDeliveryStatus(deliveryId, draft.status, draft.note || '')
      if (response.data.success) {
        setMessage(response.data.message)
        await loadDashboard()
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update delivery status')
    }
  }

  const updateDeliveryDraft = (deliveryId, patch) => {
    const key = String(deliveryId)
    setDeliveryDrafts((prev) => ({
      ...prev,
      [key]: {
        status: prev[key]?.status || '',
        note: prev[key]?.note || '',
        ...patch,
      },
    }))
  }

  const paymentMatchesCategory = (payment) => {
    if (paymentCategory === 'registration') return payment.type === 'REGISTRATION_FEES'
    if (paymentCategory === 'winning') return payment.type === 'WINNING_PAYMENT' || payment.type === 'BUY_IT_NOW_PAYMENT'
    return true
  }

  const filteredPayments = payments.filter((payment) => {
    if (!paymentMatchesCategory(payment)) return false
    if (paymentStatusFilter !== 'ALL' && payment.status !== paymentStatusFilter) return false
    return true
  })

  const filteredDeliveries = deliveries.filter((delivery) => {
    if (deliveryStatusFilter === 'ALL') return true
    return delivery.status === deliveryStatusFilter
  })

  const renderAuctionDetailModal = () => {
    if (!selectedAuctionDetail) return null
    const auction = selectedAuctionDetail
    const image = auction?.product?.images?.[0]

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedAuctionDetail(null)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Auction Details</h3>
            <button onClick={() => setSelectedAuctionDetail(null)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Close</button>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
              <img src={image || 'https://via.placeholder.com/800x500'} alt={auction.title} className="w-full h-64 object-cover" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-slate-900">{auction.title}</h4>
              <p className="text-sm text-slate-600">Seller: {auction.createdBy?.fullname || auction.createdBy?.username || auction.createdBy?.email || 'N/A'}</p>
              <p className="text-sm text-slate-600">Category: {auction.product?.category || 'N/A'}</p>
              <p className="text-sm text-slate-600">Condition: {auction.product?.condition || 'N/A'}</p>
              <p className="text-sm text-slate-600">Current Bid: ₹{Number(auction.currentBid || auction.startingPrice || 0).toLocaleString()}</p>
              <p className="text-sm text-slate-600">Total Bids: {Number(auction.totalBids || 0)}</p>
              <p className="text-sm text-slate-600">Start: {auction.startTime ? new Date(auction.startTime).toLocaleString() : 'N/A'}</p>
              <p className="text-sm text-slate-600">End: {auction.endTime ? new Date(auction.endTime).toLocaleString() : 'N/A'}</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</p>
                <p className="text-sm text-slate-700 mt-2 leading-6">{auction.product?.description || 'No description provided'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const logout = async () => {
    try {
      await adminAPI.logout()
    } catch (error) {
      // no-op
    }
    localStorage.removeItem('adminToken')
    navigate('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-28 rounded-2xl bg-white animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-24 rounded-xl bg-white animate-pulse" />
            ))}
          </div>
          <div className="h-80 rounded-2xl bg-white animate-pulse" />
        </div>
      </div>
    )
  }

  const statCards = overview
    ? [
        {
          key: 'pendingVerificationAuctions',
          label: 'Pending Verification',
          value: overview.pendingVerificationAuctions,
          icon: LayoutList,
          tone: 'bg-amber-50 text-amber-700 border-amber-200',
        },
        {
          key: 'totalVerifiedAuctions',
          label: 'Verified Auctions',
          value: overview.totalVerifiedAuctions,
          icon: CheckCircle2,
          tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
        {
          key: 'totalDeliveries',
          label: 'Total Deliveries',
          value: overview.totalDeliveries,
          icon: Truck,
          tone: 'bg-sky-50 text-sky-700 border-sky-200',
        },
        {
          key: 'pendingDeliveries',
          label: 'Pending Deliveries',
          value: overview.pendingDeliveries,
          icon: Clock3,
          tone: 'bg-violet-50 text-violet-700 border-violet-200',
        },
        {
          key: 'paidPayments',
          label: 'Paid Payments',
          value: overview.paidPayments,
          icon: Wallet,
          tone: 'bg-rose-50 text-rose-700 border-rose-200',
        },
      ]
    : []

  const tabButtonClass = (name) => `px-4 py-2.5 rounded-xl font-semibold transition-all border ${
    tab === name
      ? 'bg-slate-900 text-white border-slate-900 shadow'
      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
  }`

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white p-6 mb-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-slate-300 text-sm font-semibold tracking-wide uppercase">Control Center</p>
              <h1 className="text-3xl font-bold mt-1">Admin Dashboard</h1>
            </div>
            <button onClick={logout} className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20">
              Logout
            </button>
          </div>
        </div>

        {message ? (
          <div className="mb-4 p-3 rounded-xl border border-sky-200 bg-sky-50 text-sky-700">{message}</div>
        ) : null}

        {overview ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.key} className={`rounded-xl border p-4 ${stat.tone}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold opacity-90">{stat.label}</p>
                    <Icon className="w-5 h-5 opacity-90" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{Number(stat.value || 0).toLocaleString()}</p>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className="rounded-2xl bg-white shadow-lg p-4 mb-4 flex flex-wrap gap-2">
          <button onClick={() => setTab('auctions')} className={tabButtonClass('auctions')}>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Auction Verification</span>
          </button>
          <button onClick={() => setTab('live')} className={tabButtonClass('live')}>
            <span className="inline-flex items-center gap-2"><Radio className="w-4 h-4" />Live Auctions</span>
          </button>
          <button onClick={() => setTab('deliveries')} className={tabButtonClass('deliveries')}>
            <span className="inline-flex items-center gap-2"><Truck className="w-4 h-4" />Delivery Management</span>
          </button>
          <button onClick={() => setTab('payments')} className={tabButtonClass('payments')}>
            <span className="inline-flex items-center gap-2"><CreditCard className="w-4 h-4" />Payments</span>
          </button>
        </div>

        {tab === 'auctions' ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            {pendingAuctions.length === 0 ? <p className="text-gray-600">No pending auctions</p> : pendingAuctions.map((auction) => (
              <div key={auction._id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <button type="button" onClick={() => setSelectedAuctionDetail(auction)} className="flex gap-4 text-left items-start">
                    <img src={auction?.product?.images?.[0] || 'https://via.placeholder.com/160x120'} alt={auction.title} className="w-24 h-20 rounded-lg object-cover border border-slate-200" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg hover:underline">{auction.title}</h3>
                      <p className="text-sm text-slate-600">Seller: {auction.createdBy?.fullname || auction.createdBy?.username || auction.createdBy?.email}</p>
                      <p className="text-sm text-slate-600">Start: {new Date(auction.startTime).toLocaleString()}</p>
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => verifyAuction(auction._id, true)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Verify</button>
                    <button onClick={() => verifyAuction(auction._id, false)} className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'live' ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            {liveAuctions.length === 0 ? <p className="text-gray-600">No live auctions</p> : liveAuctions.map((auction) => (
              <button type="button" key={auction._id} onClick={() => setSelectedAuctionDetail(auction)} className="w-full border border-slate-200 rounded-xl p-4 hover:bg-slate-50 text-left">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <img src={auction?.product?.images?.[0] || 'https://via.placeholder.com/180x130'} alt={auction.title} className="w-28 h-20 rounded-lg object-cover border border-slate-200" />
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-lg">{auction.title}</h3>
                    <p className="text-sm text-slate-600">Seller: {auction.createdBy?.fullname || auction.createdBy?.username || auction.createdBy?.email}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm text-slate-600">
                      <p>Current Bid: ₹{Number(auction.currentBid || auction.startingPrice || 0).toLocaleString()}</p>
                      <p>Total Bids: {Number(auction.totalBids || 0)}</p>
                      <p>Current Winner: {auction.currentWinner?.fullname || auction.currentWinner?.username || auction.currentWinner?.email || 'N/A'}</p>
                      <p>Ends: {new Date(auction.endTime).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {tab === 'deliveries' ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-700">Delivery Status Filter</h3>
              <select className="input-field max-w-xs" value={deliveryStatusFilter} onChange={(e) => setDeliveryStatusFilter(e.target.value)}>
                <option value="ALL">All</option>
                <option value="CREATED">Created</option>
                {deliveryStatuses.map((status) => (
                  <option key={`filter-${status}`} value={status}>{status.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </div>
            {filteredDeliveries.length === 0 ? <p className="text-gray-600">No deliveries found</p> : filteredDeliveries.map((delivery) => (
              <div key={delivery._id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/70">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{delivery.auctionId?.title || 'Auction'}</h3>
                      <p className="text-sm text-slate-600">Buyer: {delivery.userId?.fullname || delivery.userId?.username || delivery.userId?.email}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-white text-slate-700 border-slate-200">
                        {delivery.status.replaceAll('_', ' ')}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-white text-slate-700 border-slate-200">
                        {delivery.shippingAddress?.city || 'Unknown city'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-white text-slate-700 border-slate-200">
                        {delivery.shippingAddress?.phone || 'No phone'}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Shipping Address</p>
                      <p className="text-sm text-slate-700 mt-2 leading-6">{formatAddress(delivery.shippingAddress)}</p>
                    </div>
                  </div>

                  <div className="w-full xl:w-[420px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Update Delivery Status</p>
                      <p className="text-xs text-slate-500 mt-1">Choose any current or next status, add a note, and save the change.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Status</label>
                        <select
                          className="input-field"
                          value={deliveryDrafts[String(delivery._id)]?.status || delivery.status}
                          onChange={(e) => updateDeliveryDraft(delivery._id, { status: e.target.value })}
                        >
                          {deliveryStatuses.map((status) => (
                            <option key={`${delivery._id}-${status}`} value={status}>
                              {status.replaceAll('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Admin Note</label>
                        <input
                          type="text"
                          value={deliveryDrafts[String(delivery._id)]?.note || ''}
                          onChange={(e) => updateDeliveryDraft(delivery._id, { note: e.target.value })}
                          className="input-field"
                          placeholder="Add a brief note for this status change"
                        />
                      </div>

                      <button
                        onClick={() => updateDeliveryStatus(delivery._id)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-700 font-semibold"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'payments' ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex gap-2">
                <button onClick={() => setPaymentCategory('all')} className={`px-3 py-2 rounded-lg font-semibold border ${paymentCategory === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>All Payments</button>
                <button onClick={() => setPaymentCategory('registration')} className={`px-3 py-2 rounded-lg font-semibold border ${paymentCategory === 'registration' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>Registration Fees</button>
                <button onClick={() => setPaymentCategory('winning')} className={`px-3 py-2 rounded-lg font-semibold border ${paymentCategory === 'winning' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>Winning Payments</button>
              </div>
              <select className="input-field max-w-xs" value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SUCCESS">Success</option>
                <option value="PAID">Paid</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            {filteredPayments.length === 0 ? <p className="text-gray-600">No payments found</p> : filteredPayments.map((payment) => (
              <div key={payment._id} className="border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 text-lg">{payment.auctionId?.title || 'Auction'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 mt-2">
                  <p>Buyer: {payment.userId?.fullname || payment.userId?.username || payment.userId?.email || 'N/A'}</p>
                  <p>Type: {String(payment.type || 'N/A').replaceAll('_', ' ')}</p>
                  <p>Amount: ₹{Number(payment.amount || 0).toLocaleString()}</p>
                  <p>
                    Status:{' '}
                    <span className={`font-semibold ${payment.status === 'PAID' || payment.status === 'SUCCESS' ? 'text-emerald-600' : payment.status === 'FAILED' ? 'text-rose-600' : 'text-slate-700'}`}>
                      {payment.status}
                    </span>
                  </p>
                </div>
                <p className="text-sm text-slate-500 mt-1">Created: {new Date(payment.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : null}

        {renderAuctionDetailModal()}
      </div>
    </div>
  )
}