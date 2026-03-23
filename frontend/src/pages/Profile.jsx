import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { User, Mail, MapPin, Truck, CreditCard, Gavel, Trophy, PackageOpen, ShieldCheck, BadgeCheck, CircleDollarSign, Boxes } from 'lucide-react'
import { useAuthStore } from '../store'
import { auctionAPI, authAPI } from '../services/api'
import AuctionCard from '../components/AuctionCard'

const initialAddress = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  phone: '',
}

export default function Profile() {
  const { user } = useAuthStore()
  const { userId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const isOwnProfile = !userId || String(userId) === String(user?._id)

  const [profileUser, setProfileUser] = useState(user)
  const [stats, setStats] = useState({
    totalAuctions: 0,
    activeAuctions: 0,
    completedAuctions: 0,
    totalBids: 0,
  })
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('recent')
  const [activityItems, setActivityItems] = useState([])
  const [savedAuctions, setSavedAuctions] = useState([])
  const [winningAuctions, setWinningAuctions] = useState([])
  const [myAuctions, setMyAuctions] = useState([])
  const [tabLoading, setTabLoading] = useState(false)

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const [address, setAddress] = useState(initialAddress)
  const [addressLoading, setAddressLoading] = useState(false)

  const [deliveryByAuction, setDeliveryByAuction] = useState({})
  const [deliveryLoadingAuctionId, setDeliveryLoadingAuctionId] = useState('')
  const [paymentLoadingAuctionId, setPaymentLoadingAuctionId] = useState('')
  const [editingAuctionId, setEditingAuctionId] = useState('')
  const [myAuctionEditLoading, setMyAuctionEditLoading] = useState(false)
  const [myAuctionEditData, setMyAuctionEditData] = useState({
    title: '',
    productName: '',
    productCategory: '',
    productCondition: 'new',
    startingPrice: '',
    minIncrement: '',
    buyItNow: '',
    registrationsStartTime: '',
    startTime: '',
    endTime: '',
    description: '',
  })
  const [myAuctionEditImages, setMyAuctionEditImages] = useState([])

  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [message])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab && ['recent', 'my-auctions', 'saved', 'winning'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [location.search])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (isOwnProfile) {
          const [meRes, activityRes, savedRes, winningRes, auctionsRes, myAuctionsRes] = await Promise.all([
            authAPI.me(),
            authAPI.getMyActivity(0, 20),
            authAPI.getSavedAuctions(),
            authAPI.getWinningAuctions(),
            auctionAPI.list(),
            authAPI.getMyAuctions(),
          ])

          if (meRes.data.success) {
            setProfileUser(meRes.data.user)
            setAddress({ ...initialAddress, ...(meRes.data.user.address || {}) })
          }

          if (activityRes.data.success) {
            setActivityItems(activityRes.data.items || [])
          }

          if (savedRes.data.success) {
            setSavedAuctions(savedRes.data.auctions || [])
          }

          if (winningRes.data.success) {
            setWinningAuctions(winningRes.data.items || [])
          }

          if (myAuctionsRes?.data?.success) {
            setMyAuctions(myAuctionsRes.data.items || [])
          }

          if (auctionsRes.data.success) {
            const auctions = auctionsRes.data.auctions || []
            setStats({
              totalAuctions: auctions.filter((a) => String(a.createdBy?._id || a.createdBy) === String(user?._id)).length,
              activeAuctions: auctions.filter((a) => String(a.createdBy?._id || a.createdBy) === String(user?._id) && (a.status === 'LIVE' || a.status === 'UPCOMING')).length,
              completedAuctions: auctions.filter((a) => String(a.createdBy?._id || a.createdBy) === String(user?._id) && (a.status === 'COMPLETED' || a.status === 'ENDED')).length,
              totalBids: auctions.reduce((sum, a) => sum + (a.totalBids || 0), 0),
            })
          }
        } else {
          const response = await authAPI.getProfile(userId)
          if (response.data.success) {
            setProfileUser(response.data.profile)
            setStats(response.data.stats)
          }
        }
      } catch (error) {
        setMessage('Failed to load profile details')
        setMessageType('error')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [isOwnProfile, userId, user?._id])

  const refreshOwnTabs = async () => {
    if (!isOwnProfile) return
    setTabLoading(true)
    try {
      const [activityRes, savedRes, winningRes, myAuctionsRes] = await Promise.all([
        authAPI.getMyActivity(0, 20),
        authAPI.getSavedAuctions(),
        authAPI.getWinningAuctions(),
        authAPI.getMyAuctions(),
      ])
      
      if (activityRes.data.success) setActivityItems(activityRes.data.items || [])
      if (savedRes.data.success) setSavedAuctions(savedRes.data.auctions || [])
      if (winningRes.data.success) setWinningAuctions(winningRes.data.items || [])
      if (myAuctionsRes.data.success) {
        const items = myAuctionsRes.data.items || []
        setMyAuctions(items)
      }
    } catch (error) {
      console.error('Error refreshing tabs:', error)
    } finally {
      setTabLoading(false)
    }
  }

  const handleAddressChange = (e) => {
    const { name, value } = e.target
    setAddress((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveAddress = async (e) => {
    e.preventDefault()
    setAddressLoading(true)
    try {
      const response = await authAPI.updateAddress(address)
      if (response.data.success) {
        setMessage('Address updated successfully')
        setMessageType('success')
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update address')
      setMessageType('error')
    } finally {
      setAddressLoading(false)
    }
  }

  const ensureRazorpayScript = async () => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) return

    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = resolve
      script.onerror = reject
      document.body.appendChild(script)
    })
  }

  const handlePayWinning = async (auctionId) => {
    setPaymentLoadingAuctionId(String(auctionId))
    try {
      await ensureRazorpayScript()

      const createRes = await auctionAPI.pay(auctionId)
      const paymentData = createRes.data
      if (!paymentData.success) {
        setMessage(paymentData.message || 'Failed to initiate payment')
        setMessageType('error')
        return
      }

      const options = {
        key: paymentData.paymentOrder.keyId,
        amount: paymentData.paymentOrder.amount,
        currency: paymentData.paymentOrder.currency,
        name: 'BidVault',
        description: 'Winning Payment',
        order_id: paymentData.paymentOrder.orderId,
        handler: async (rzpResp) => {
          try {
            const verifyRes = await auctionAPI.verifyWinningPayment(auctionId, {
              razorpayOrderId: paymentData.paymentOrder.orderId,
              razorpayPaymentId: rzpResp.razorpay_payment_id,
              razorpaySignature: rzpResp.razorpay_signature,
              paymentId: paymentData.paymentId,
              auctionId,
            })

            if (verifyRes.data.success) {
              setMessage('Winning payment completed successfully')
              setMessageType('success')
              await refreshOwnTabs()
            }
          } catch (error) {
            setMessage(error.response?.data?.message || 'Payment verification failed')
            setMessageType('error')
          }
        },
        prefill: {
          email: profileUser?.email,
        },
        theme: {
          color: '#0284c7',
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Payment initiation failed')
      setMessageType('error')
    } finally {
      setPaymentLoadingAuctionId('')
    }
  }

  const handleTrackDelivery = async (auctionId) => {
    setDeliveryLoadingAuctionId(String(auctionId))
    try {
      const response = await auctionAPI.getMyDeliveryForAuction(auctionId)
      if (response.data.success) {
        setDeliveryByAuction((prev) => ({
          ...prev,
          [String(auctionId)]: response.data.delivery,
        }))
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Delivery details not available')
      setMessageType('error')
    } finally {
      setDeliveryLoadingAuctionId('')
    }
  }

  const statCards = useMemo(
    () => [
      { label: 'Total Auctions', value: stats.totalAuctions, color: 'text-primary-600 bg-primary-50' },
      { label: 'Active Auctions', value: stats.activeAuctions, color: 'text-accent-600 bg-accent-50' },
      { label: 'Completed', value: stats.completedAuctions, color: 'text-success-600 bg-success-50' },
      { label: 'Total Bids', value: stats.totalBids, color: 'text-gray-700 bg-gray-100' },
    ],
    [stats]
  )

  const renderActivityItem = (item) => {
    if (item.type === 'BID') {
      return (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Gavel className="w-4 h-4" />
            <p className="text-sm font-semibold">Bid Placed</p>
          </div>
          <p className="font-semibold text-gray-900">{item.data?.auction?.title || 'Auction'}</p>
          <p className="text-sm text-gray-700 mt-1">Bid Amount: ₹{Number(item.data?.amount || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
        </div>
      )
    }

    if (item.type === 'WIN') {
      return (
        <div className="border border-success-200 bg-success-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-success-700 mb-2">
            <Trophy className="w-4 h-4" />
            <p className="text-sm font-semibold">Winning Payment</p>
          </div>
          <p className="font-semibold text-gray-900">{item.data?.auction?.title || 'Auction'}</p>
          <p className="text-sm text-gray-700 mt-1">Amount: ₹{Number(item.data?.amount || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Type: {String(item.data?.paymentType || '').replaceAll('_', ' ') || 'N/A'}</p>
          <p className="text-xs text-gray-500 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
        </div>
      )
    }

    return (
      <div className="border border-accent-200 bg-accent-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-accent-700 mb-2">
          <PackageOpen className="w-4 h-4" />
          <p className="text-sm font-semibold">Auction Activity</p>
        </div>
        <p className="font-semibold text-gray-900">{item.data?.title || 'Auction'}</p>
        <p className="text-sm text-gray-700 mt-1">Status: {item.data?.status || 'N/A'}</p>
        <p className="text-xs text-gray-500 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
      </div>
    )
  }

  const getVerificationTone = (auctionItem) => {
    if (!auctionItem?.isVerified) {
      return 'bg-amber-50 text-amber-700 border-amber-200'
    }
    if (auctionItem.auction?.status === 'LIVE') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
    if (auctionItem.auction?.status === 'COMPLETED' || auctionItem.auction?.status === 'ENDED') {
      return 'bg-slate-100 text-slate-700 border-slate-200'
    }
    return 'bg-sky-50 text-sky-700 border-sky-200'
  }

  const formatDateTimeLocal = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const getMinDateTimeLocal = () => {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  }

  const canEditMyAuction = (auction) => {
    if (!auction) return false
    if (auction.status !== 'UPCOMING') return false
    
    const regTime = auction?.registrationsStartTime ? new Date(auction.registrationsStartTime) : null
    if (!regTime || isNaN(regTime.getTime())) return false
    
    const now = new Date()
    return now < regTime
  }

  const isPostVerificationEdit = (auction) => Boolean(auction?.isVerified)

  const openMyAuctionEdit = (item) => {
    const auction = item?.auction
    if (!auction || !canEditMyAuction(auction)) {
      setMessage('Auctions can be edited only before registration starts')
      setMessageType('error')
      return
    }

    setEditingAuctionId(String(auction._id))
    setMyAuctionEditData({
      title: auction.title || '',
      productName: auction.product?.name || '',
      productCategory: auction.product?.category || '',
      productCondition: auction.product?.condition || 'new',
      startingPrice: auction.startingPrice || '',
      minIncrement: auction.minIncrement || '',
      buyItNow: auction.buyItNow || '',
      registrationsStartTime: formatDateTimeLocal(auction.registrationsStartTime),
      startTime: formatDateTimeLocal(auction.startTime),
      endTime: formatDateTimeLocal(auction.endTime),
      description: auction.product?.description || '',
    })
    setMyAuctionEditImages([])
  }

  const handleMyAuctionEditSubmit = async (auctionId) => {
    setMyAuctionEditLoading(true)
    try {
      const now = new Date()
      const regStart = new Date(myAuctionEditData.registrationsStartTime)
      const start = new Date(myAuctionEditData.startTime)
      const end = new Date(myAuctionEditData.endTime)
      if (regStart < now || start < now || end < now) {
        setMessage('Auction timeline cannot be in the past')
        setMessageType('error')
        setMyAuctionEditLoading(false)
        return
      }

      const auctionItem = myAuctions.find((item) => String(item?.auction?._id) === String(auctionId))
      const postVerification = isPostVerificationEdit(auctionItem?.auction)

      const payload = {
        registrationsStartTime: new Date(
          myAuctionEditData.registrationsStartTime
        ).toISOString(),

        startTime: new Date(
          myAuctionEditData.startTime
        ).toISOString(),

        endTime: new Date(
          myAuctionEditData.endTime
        ).toISOString(),

        description: myAuctionEditData.description,
      }
      
      if (!postVerification) {
        payload.title = myAuctionEditData.title
        payload.productName = myAuctionEditData.productName
        payload.productCategory = myAuctionEditData.productCategory
        payload.productCondition = myAuctionEditData.productCondition
        payload.startingPrice = myAuctionEditData.startingPrice
        payload.minIncrement = myAuctionEditData.minIncrement
        payload.buyItNow = myAuctionEditData.buyItNow
      }

      let response
      if (!postVerification && myAuctionEditImages.length > 0) {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value)
          }
        })
        myAuctionEditImages.forEach((file) => formData.append('images', file))
        response = await auctionAPI.edit(auctionId, formData)
      } else {
        response = await auctionAPI.edit(auctionId, payload)
      }

      if (response.data.success) {
        setMessage('Auction updated successfully')
        setMessageType('success')
        setEditingAuctionId('')
        setMyAuctionEditImages([])
        // Add a small delay to ensure backend cache is cleared
        await new Promise(resolve => setTimeout(resolve, 100))
        await refreshOwnTabs()
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update auction')
      setMessageType('error')
    } finally {
      setMyAuctionEditLoading(false)
    }
  }

  const renderMyAuctionCard = (item) => {
    const auction = item.auction
    const payment = item.payment
    const delivery = item.delivery
    const isVerified = Boolean(item.isVerified ?? auction?.isVerified)
    const statusLabel = isVerified ? 'Verified' : 'Under Verification'
    const statusTone = isVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
    const paymentStatus = item.paymentStatus || (payment?.status || null)
    const isEditingThis = editingAuctionId === String(auction._id)
    const isEditable = canEditMyAuction(auction)
    const postVerification = isPostVerificationEdit(auction)

    return (
      <div key={auction._id} className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <button onClick={() => navigate(`/auction/${auction._id}`)} className="text-left text-lg font-bold text-gray-900 hover:text-primary-600 hover:underline">
              {auction.title}
            </button>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusTone}`}>{statusLabel}</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-slate-100 text-slate-700 border-slate-200">{auction.status.replaceAll('_', ' ')}</span>
              {auction.auctionWinner && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-violet-50 text-violet-700 border-violet-200">Winner Declared</span>
              )}
            </div>
            <p className="text-sm text-gray-600">Product: {auction.product?.name || auction.product?.category || 'Auction item'}</p>
            <p className="text-sm text-gray-600">Current Bid: ₹{Number(auction.currentBid || auction.startingPrice || 0).toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-[260px]">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</p>
              <p className="text-sm font-bold text-gray-900 mt-1">₹{Number(auction.startingPrice || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Increment ₹{Number(auction.minIncrement || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stats</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{Number(auction.totalBids || 0)} bids</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(auction.createdAt).toLocaleDateString()}</p>
            </div>
            {isEditable ? (
              <button
                type="button"
                onClick={() => openMyAuctionEdit(item)}
                className="rounded-xl border border-primary-200 bg-primary-50 p-3 text-sm font-semibold text-primary-700 hover:bg-primary-100"
              >
                Edit Auction
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Verification</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{statusLabel}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registration Opens</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{auction.registrationsStartTime ? new Date(auction.registrationsStartTime).toLocaleString() : 'Not set'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Auction Window</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{new Date(auction.startTime).toLocaleString()} - {new Date(auction.endTime).toLocaleString()}</p>
          </div>
        </div>

        {isEditingThis ? (
          <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-primary-700">{postVerification ? 'Verified Auction: Dates + Description only' : 'Unverified Auction: Full edit allowed'}</p>
            {!postVerification && (
              <>
                <input
                  className="input-field"
                  value={myAuctionEditData.title}
                  onChange={(e) => setMyAuctionEditData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Auction title"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    className="input-field"
                    value={myAuctionEditData.productName}
                    onChange={(e) => setMyAuctionEditData((prev) => ({ ...prev, productName: e.target.value }))}
                    placeholder="Product name"
                  />
                  <input
                    className="input-field"
                    value={myAuctionEditData.productCategory}
                    onChange={(e) => setMyAuctionEditData((prev) => ({ ...prev, productCategory: e.target.value }))}
                    placeholder="Product category"
                  />
                </div>
                <select
                  className="input-field"
                  value={myAuctionEditData.productCondition}
                  onChange={(e) => setMyAuctionEditData((prev) => ({ ...prev, productCondition: e.target.value }))}
                >
                  <option value="new">New</option>
                  <option value="like new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="number"
                    className="input-field"
                    value={myAuctionEditData.startingPrice}
                    onChange={(e) => setMyAuctionEditData((prev) => ({ ...prev, startingPrice: e.target.value }))}
                    placeholder="Starting price"
                  />
                  <input
                    type="number"
                    className="input-field"
                    value={myAuctionEditData.minIncrement}
                    onChange={(e) => setMyAuctionEditData((prev) => ({ ...prev, minIncrement: e.target.value }))}
                    placeholder="Min increment"
                  />
                  <input
                    type="number"
                    className="input-field"
                    value={myAuctionEditData.buyItNow}
                    onChange={(e) => setMyAuctionEditData((prev) => ({ ...prev, buyItNow: e.target.value }))}
                    placeholder="Buy it now"
                  />
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="input-field"
                  onChange={(e) => setMyAuctionEditImages(Array.from(e.target.files || []))}
                />
              </>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Registration Start Time</label>
              <input
                type="datetime-local"
                className="input-field"
                min={getMinDateTimeLocal()}
                value={myAuctionEditData.registrationsStartTime}
                onChange={(e) => setMyAuctionEditData((prev) => ({ ...prev, registrationsStartTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Auction Start Time</label>
              <input
                type="datetime-local"
                className="input-field"
                min={getMinDateTimeLocal()}
                value={myAuctionEditData.startTime}
                onChange={(e) => setMyAuctionEditData((prev) => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Auction End Time</label>
              <input
                type="datetime-local"
                className="input-field"
                min={getMinDateTimeLocal()}
                value={myAuctionEditData.endTime}
                onChange={(e) => setMyAuctionEditData((prev) => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
            <textarea
              className="input-field resize-none"
              rows="3"
              value={myAuctionEditData.description}
              onChange={(e) => setMyAuctionEditData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Update description"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingAuctionId('')}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={myAuctionEditLoading}
                onClick={() => handleMyAuctionEditSubmit(auction._id)}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                {myAuctionEditLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : null}

        {(auction.status === 'COMPLETED' || auction.status === 'ENDED') && (payment || delivery) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-700 mb-1">
                <CircleDollarSign className="w-4 h-4" />
                <p className="font-semibold text-sm">Payment State</p>
              </div>
              <p className="text-sm text-emerald-700 font-semibold">{payment ? `${payment.status} • ${String(payment.type || '').replaceAll('_', ' ')}` : 'Pending'}</p>
              <p className="text-xs text-emerald-700/80 mt-1">Amount: ₹{Number(payment?.amount || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <div className="flex items-center gap-2 text-sky-700 mb-1">
                <Boxes className="w-4 h-4" />
                <p className="font-semibold text-sm">Delivery State</p>
              </div>
              <p className="text-sm text-sky-700 font-semibold">{delivery ? delivery.status.replaceAll('_', ' ') : 'Pending'}</p>
              <p className="text-xs text-sky-700/80 mt-1">{delivery?.shippingAddress?.city || 'No delivery address linked yet'}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-40 bg-white rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-md ${messageType === 'error' ? 'bg-danger-50 text-danger-600 border border-danger-200' : 'bg-success-50 text-success-700 border border-success-200'}`}>
          {message}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-accent-500 rounded-full flex items-center justify-center text-white">
              <User className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{profileUser?.fullname || profileUser?.username || 'User'}</h1>
              <p className="text-gray-600 flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                {profileUser?.email || 'user@example.com'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <div key={stat.label} className={`rounded-lg p-4 ${stat.color}`}>
                <p className="text-sm font-semibold opacity-80">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {isOwnProfile && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-600" />
              Delivery Address
            </h2>
            <form onSubmit={handleSaveAddress} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input name="line1" value={address.line1} onChange={handleAddressChange} className="input-field" placeholder="Address line 1" required />
              <input name="line2" value={address.line2} onChange={handleAddressChange} className="input-field" placeholder="Address line 2 (optional)" />
              <input name="city" value={address.city} onChange={handleAddressChange} className="input-field" placeholder="City" required />
              <input name="state" value={address.state} onChange={handleAddressChange} className="input-field" placeholder="State" required />
              <input name="pincode" value={address.pincode} onChange={handleAddressChange} className="input-field" placeholder="Pincode" required />
              <input name="country" value={address.country} onChange={handleAddressChange} className="input-field" placeholder="Country" required />
              <input name="phone" value={address.phone} onChange={handleAddressChange} className="input-field md:col-span-2" placeholder="Phone" required />
              <button type="submit" disabled={addressLoading} className="btn-primary md:col-span-2">
                {addressLoading ? 'Saving...' : 'Save Address'}
              </button>
            </form>
          </div>
        )}

        {isOwnProfile ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex gap-2 border-b border-gray-200 mb-6 overflow-x-auto">
              <button onClick={() => setActiveTab('recent')} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === 'recent' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-600'}`}>
                Recent Activities
              </button>
              <button onClick={() => setActiveTab('my-auctions')} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === 'my-auctions' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-600'}`}>
                My Auctions
              </button>
              <button onClick={() => setActiveTab('saved')} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === 'saved' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-600'}`}>
                Saved Auctions
              </button>
              <button onClick={() => setActiveTab('winning')} className={`px-4 py-2 font-semibold whitespace-nowrap ${activeTab === 'winning' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-600'}`}>
                Winning Auctions
              </button>
            </div>

            {tabLoading ? <p className="text-gray-600">Loading...</p> : null}

            {activeTab === 'recent' && (
              <div className="space-y-4">
                {activityItems.length === 0 ? <p className="text-gray-600">No activity yet</p> : activityItems.map((item) => (
                  <div key={`${item.type}-${item.id}`}>
                    {renderActivityItem(item)}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'my-auctions' && (
              <div className="space-y-4">
                {myAuctions.length === 0 ? (
                  <p className="text-gray-600">No auctions created yet</p>
                ) : (
                  myAuctions.map((item) => renderMyAuctionCard(item))
                )}
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedAuctions.length === 0 ? <p className="text-gray-600">No saved auctions yet</p> : savedAuctions.map((auction) => (
                  <AuctionCard key={auction._id} auction={auction} />
                ))}
              </div>
            )}

            {activeTab === 'winning' && (
              <div className="space-y-4">
                {winningAuctions.length === 0 ? <p className="text-gray-600">No winning auctions yet</p> : winningAuctions.map((item) => {
                  const auction = item.auction
                  const delivery = deliveryByAuction[String(auction._id)]
                  return (
                    <div key={auction._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <button onClick={() => navigate(`/auction/${auction._id}`)} className="font-bold text-gray-900 hover:text-primary-600 hover:underline">
                            {auction.title}
                          </button>
                          <p className="text-sm text-gray-600">Final Price: ₹{Number(auction.finalPrice || auction.currentBid || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!item.isPaid ? (
                            <button
                              type="button"
                              onClick={() => handlePayWinning(auction._id)}
                              disabled={paymentLoadingAuctionId === String(auction._id)}
                              className="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              <CreditCard className="w-4 h-4" />
                              {paymentLoadingAuctionId === String(auction._id) ? 'Paying...' : 'Pay'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTrackDelivery(auction._id)}
                              disabled={deliveryLoadingAuctionId === String(auction._id)}
                              className="px-4 py-2 rounded-lg bg-accent-600 text-white font-semibold hover:bg-accent-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              <Truck className="w-4 h-4" />
                              {deliveryLoadingAuctionId === String(auction._id) ? 'Loading...' : 'Track Delivery'}
                            </button>
                          )}
                        </div>
                      </div>

                      {delivery ? (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="text-sm font-semibold text-gray-800">Current: {delivery.status.replaceAll('_', ' ')}</p>
                          <div className="mt-2 space-y-2">
                            {(delivery.timeline || []).slice().reverse().map((entry, index) => (
                              <div key={`${entry.status}-${index}`} className="text-xs text-gray-700">
                                {entry.status.replaceAll('_', ' ')} {entry.note ? `- ${entry.note}` : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 text-gray-600">Public profile view</div>
        )}
      </div>
    </div>
  )
}