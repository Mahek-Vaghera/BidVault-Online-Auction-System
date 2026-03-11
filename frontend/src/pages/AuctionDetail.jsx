import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Clock, Gavel, TrendingUp, Users, AlertCircle, CheckCircle,
  Eye, Heart, Share2, Target, CreditCard, Loader
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { auctionAPI, bidAPI, leaderboardAPI, authAPI } from '../services/api'
import {
  joinAuction, leaveAuction, onBidUpdate, onAuctionExtended,
  onAuctionEnded, onLeaderboardUpdate, onAuctionStarted,
  offBidUpdate, offAuctionExtended, offAuctionEnded, offLeaderboardUpdate, offAuctionStarted
} from '../services/socket'
import BidForm from '../components/BidForm'
import Leaderboard from '../components/Leaderboard'
import { useAuthStore } from '../store'

export default function AuctionDetail() {
  const { auctionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [auction, setAuction] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [userBid, setUserBid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  
  // Registration/Payment states
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [registrationLoading, setRegistrationLoading] = useState(false)
  const [buyNowLoading, setBuyNowLoading] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [, setPaymentData] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState({ hasBuyNowPayment: false, hasWinningPayment: false })
  const [deliveryStatus, setDeliveryStatus] = useState({ exists: false })
  const [winnerPaymentLoading, setWinnerPaymentLoading] = useState(false)
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [delivery, setDelivery] = useState(null)
  const [isSaved, setIsSaved] = useState(false)
  const [now, setNow] = useState(new Date())
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    productName: '',
    productCategory: '',
    productCondition: 'new',
    description: '',
    startingPrice: '',
    minIncrement: '',
    buyItNow: '',
    registrationsStartTime: '',
    startTime: '',
    endTime: '',
  })
  const [editImages, setEditImages] = useState([])

  const formatDateTimeLocal = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const getMinDateTimeLocal = () => {
    const nowValue = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${nowValue.getFullYear()}-${pad(nowValue.getMonth() + 1)}-${pad(nowValue.getDate())}T${pad(nowValue.getHours())}:${pad(nowValue.getMinutes())}`
  }

  useEffect(() => {
    fetchAuctionData()
  }, [auctionId])

  useEffect(() => {
    if (!auction) return

    // Join auction room for real-time updates
    joinAuction(auctionId)

    // Set up real-time listeners
    onBidUpdate(auctionId, handleBidUpdate)
    onAuctionExtended(auctionId, handleAuctionExtended)
    onAuctionEnded(auctionId, handleAuctionEnded)
    onLeaderboardUpdate(auctionId, handleLeaderboardUpdate)
    onAuctionStarted(auctionId, handleAuctionStarted)

    return () => {
      leaveAuction(auctionId)
      offBidUpdate(auctionId)
      offAuctionExtended(auctionId)
      offAuctionEnded(auctionId)
      offLeaderboardUpdate(auctionId)
      offAuctionStarted(auctionId)
    }
  }, [auction, auctionId])

  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => setMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [message])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchAuctionData = async () => {
    setLoading(true)
    try {
      const [auctionRes, leaderboardRes, userBidRes] = await Promise.all([
        auctionAPI.getOne(auctionId),
        leaderboardAPI.getLeaderboard(auctionId),
        leaderboardAPI.getUserBidDetails(auctionId).catch(() => null)
      ])

      if (auctionRes.data.success) {
        const fetchedAuction = auctionRes.data.auction
        setAuction(fetchedAuction)
        setPaymentStatus(auctionRes.data.paymentStatus || { hasBuyNowPayment: false, hasWinningPayment: false })
        setDeliveryStatus(auctionRes.data.deliveryStatus || { exists: false })
        setSelectedImageIndex(0)
        setEditData({
          title: fetchedAuction.title || '',
          productName: fetchedAuction.product?.name || '',
          productCategory: fetchedAuction.product?.category || '',
          productCondition: fetchedAuction.product?.condition || 'new',
          description: fetchedAuction.product?.description || '',
          startingPrice: fetchedAuction.startingPrice || '',
          minIncrement: fetchedAuction.minIncrement || '',
          buyItNow: fetchedAuction.buyItNow || '',
          registrationsStartTime: formatDateTimeLocal(fetchedAuction.registrationsStartTime),
          startTime: formatDateTimeLocal(fetchedAuction.startTime),
          endTime: formatDateTimeLocal(fetchedAuction.endTime),
        })
        setEditImages([])
      }

      if (leaderboardRes.data.success) {
        setLeaderboard(leaderboardRes.data.data?.leaderboard || [])
      }

      if (userBidRes?.data.success) {
        setUserBid(userBidRes.data.data)
      }

      const savedRes = await authAPI.getSavedAuctions().catch(() => null)
      if (savedRes?.data?.success) {
        const isCurrentSaved = (savedRes.data.auctions || []).some((a) => String(a._id) === String(auctionId))
        setIsSaved(isCurrentSaved)
      }
    } catch (error) {
      setMessage('Failed to load auction details')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const refreshUserBidDetails = async () => {
    try {
      const userBidRes = await leaderboardAPI.getUserBidDetails(auctionId)
      if (userBidRes?.data?.success) {
        setUserBid(userBidRes.data.data)
      }
    } catch (error) {
      setUserBid(null)
    }
  }

  const handleBidUpdate = (data) => {
    setAuction((prev) => ({
      ...prev,
      currentBid: data.currentBid,
      currentWinner: data.currentWinner,
      totalBids: data.totalBids
    }))

    refreshUserBidDetails()

    setMessage(`New bid: ₹${data.currentBid} by ${data.winnerName}`)
    setMessageType('info')
  }

  const handleLeaderboardUpdate = (data) => {
    if (Array.isArray(data?.leaderboard)) {
      setLeaderboard(data.leaderboard)
    }
  }

  const handleAuctionExtended = (data) => {
    setAuction((prev) => ({
      ...prev,
      endTime: data.newEndTime
    }))

    setMessage(data.message)
    setMessageType('info')
  }

  const handleAuctionEnded = (data) => {
    setAuction((prev) => ({
      ...prev,
      status: data?.winnerId ? 'COMPLETED' : 'CANCELLED',
      auctionWinner: data.winnerId,
      finalPrice: data.finalPrice
    }))

    setMessage(data.message)
    setMessageType('success')
  }

  const handleAuctionStarted = async (data) => {
    setAuction((prev) => ({
      ...prev,
      status: 'LIVE'
    }))
    setMessage(data.message || 'Auction is now LIVE')
    setMessageType('success')
  }

  const handleToggleSaveAuction = async () => {
    try {
      const response = await auctionAPI.toggleSave(auctionId)
      if (response.data.success) {
        setIsSaved(Boolean(response.data.saved))
        setMessage(response.data.message)
        setMessageType('success')
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update saved auction')
      setMessageType('error')
    }
  }

  const handleTrackDelivery = async () => {
    setDeliveryLoading(true)
    try {
      const response = await auctionAPI.getMyDeliveryForAuction(auctionId)
      if (response.data.success) {
        setDelivery(response.data.delivery)
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Delivery details not available yet')
      setMessageType('error')
    } finally {
      setDeliveryLoading(false)
    }
  }

  // Handle Registration Click
  const handleRegisterClick = async () => {
    setRegistrationLoading(true)
    try {
      const response = await auctionAPI.register(auctionId)
      
      if (response.data.success) {
        setPaymentData(response.data)
        
        // Initialize Razorpay
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        document.body.appendChild(script)

        script.onload = () => {
          handleRazorpayPayment(response.data)
        }
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to initiate registration')
      setMessageType('error')
    } finally {
      setRegistrationLoading(false)
    }
  }

  // Handle Razorpay Payment
  const handleRazorpayPayment = (paymentData) => {
    const options = {
      key: paymentData.paymentOrder.keyId,
      amount: paymentData.paymentOrder.amount,
      currency: paymentData.paymentOrder.currency,
      name: 'BidVault',
      description: `Registration Fee - ${auction?.title}`,
      order_id: paymentData.paymentOrder.orderId,
      handler: async (response) => {
        try {
          // Verify payment with backend
          const verifyResponse = await auctionAPI.verifyRegistrationPayment(auctionId, {
            razorpayOrderId: paymentData.paymentOrder.orderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            paymentId: paymentData.paymentId,
            auctionId: auctionId,
          })

          if (verifyResponse.data.success) {
            setIsRegistered(true)
            setMessage('Successfully registered for auction!')
            setMessageType('success')
            setShowRegistrationModal(false)
            await fetchAuctionData()
          }
        } catch (error) {
          setMessage(error.response?.data?.message || 'Payment verification failed')
          setMessageType('error')
        }
      },
      prefill: {
        email: user?.email,
      },
      theme: {
        color: '#4F46E5',
      },
    }

    const window_instance = new window.Razorpay(options)
    window_instance.open()
  }

  const handleBuyNowClick = async () => {
    setBuyNowLoading(true)
    try {
      const response = await auctionAPI.buyNow(auctionId)
      if (!response.data.success) {
        setMessage(response.data.message || 'Failed to initiate Buy It Now')
        setMessageType('error')
        return
      }

      const paymentData = response.data
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)

      script.onload = () => {
        const options = {
          key: paymentData.paymentOrder.keyId,
          amount: paymentData.paymentOrder.amount,
          currency: paymentData.paymentOrder.currency,
          name: 'BidVault',
          description: `Buy It Now - ${auction?.title}`,
          order_id: paymentData.paymentOrder.orderId,
          handler: async (rzpResp) => {
            try {
              const verifyResponse = await auctionAPI.verifyBuyNowPayment(auctionId, {
                razorpayOrderId: paymentData.paymentOrder.orderId,
                razorpayPaymentId: rzpResp.razorpay_payment_id,
                razorpaySignature: rzpResp.razorpay_signature,
                paymentId: paymentData.paymentId,
              })

              if (verifyResponse.data.success) {
                setMessage('Buy It Now successful. Auction closed.')
                setMessageType('success')
                await fetchAuctionData()
              }
            } catch (error) {
              setMessage(error.response?.data?.message || 'Buy It Now verification failed')
              setMessageType('error')
            }
          },
          prefill: {
            email: user?.email,
          },
          theme: {
            color: '#4F46E5',
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to initiate Buy It Now')
      setMessageType('error')
    } finally {
      setBuyNowLoading(false)
    }
  }

  const handleWinningPaymentClick = async () => {
    setWinnerPaymentLoading(true)
    try {
      const response = await auctionAPI.pay(auctionId)
      if (!response.data.success) {
        setMessage(response.data.message || 'Failed to initiate winning payment')
        setMessageType('error')
        return
      }

      const paymentData = response.data
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)

      script.onload = () => {
        const options = {
          key: paymentData.paymentOrder.keyId,
          amount: paymentData.paymentOrder.amount,
          currency: paymentData.paymentOrder.currency,
          name: 'BidVault',
          description: `Winning Payment - ${auction?.title}`,
          order_id: paymentData.paymentOrder.orderId,
          handler: async (rzpResp) => {
            try {
              const verifyResponse = await auctionAPI.verifyWinningPayment(auctionId, {
                razorpayOrderId: paymentData.paymentOrder.orderId,
                razorpayPaymentId: rzpResp.razorpay_payment_id,
                razorpaySignature: rzpResp.razorpay_signature,
                paymentId: paymentData.paymentId,
                auctionId,
              })

              if (verifyResponse.data.success) {
                setMessage('Winning payment completed successfully.')
                setMessageType('success')
                await fetchAuctionData()
              }
            } catch (error) {
              setMessage(error.response?.data?.message || 'Winning payment verification failed')
              setMessageType('error')
            }
          },
          prefill: {
            email: user?.email,
          },
          theme: {
            color: '#4F46E5',
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to initiate winning payment')
      setMessageType('error')
    } finally {
      setWinnerPaymentLoading(false)
    }
  }

  const handleEditInputChange = (e) => {
    const { name, value } = e.target
    setEditData((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditImageChange = (e) => {
    const files = Array.from(e.target.files || [])
    setEditImages(files)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      const nowValue = new Date()
      const regStart = new Date(editData.registrationsStartTime)
      const start = new Date(editData.startTime)
      const end = new Date(editData.endTime)
      if (regStart < nowValue || start < nowValue || end < nowValue) {
        setMessage('Auction timeline cannot be in the past')
        setMessageType('error')
        setEditLoading(false)
        return
      }

      const payload = {
        registrationsStartTime: editData.registrationsStartTime,
        startTime: editData.startTime,
        endTime: editData.endTime,
        description: editData.description,
      }

      if (!auction.isVerified) {
        payload.title = editData.title
        payload.productName = editData.productName
        payload.productCategory = editData.productCategory
        payload.productCondition = editData.productCondition
        payload.startingPrice = editData.startingPrice
        payload.minIncrement = editData.minIncrement
        payload.buyItNow = editData.buyItNow
      }

      let response
      if (!auction.isVerified && editImages.length > 0) {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value)
          }
        })
        editImages.forEach((file) => formData.append('images', file))
        response = await auctionAPI.edit(auctionId, formData)
      } else {
        response = await auctionAPI.edit(auctionId, payload)
      }

      if (response.data.success) {
        setMessage('Auction updated successfully')
        setMessageType('success')
        setIsEditing(false)
        setEditImages([])
        // Add a small delay to ensure backend cache is cleared
        await new Promise(resolve => setTimeout(resolve, 100))
        await fetchAuctionData()
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update auction')
      setMessageType('error')
    } finally {
      setEditLoading(false)
    }
  }

  // Check if user is registered
  useEffect(() => {
    if (auction && auction.registrations && user?._id) {
      const registered = auction.registrations.some((id) => String(id) === String(user._id))
      setIsRegistered(registered)
    }
  }, [auction, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="bg-white rounded-xl h-96 animate-pulse" />
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white rounded-xl h-80 animate-pulse" />
              <div className="bg-white rounded-xl h-80 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-danger-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Auction Not Found</h2>
          <p className="text-gray-600">The auction you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status) => {
    const badges = {
      'LIVE': { label: '🔴 LIVE', class: 'bg-danger-50 text-danger-600' },
      'UPCOMING': { label: '⏳ UPCOMING', class: 'bg-accent-50 text-accent-600' },
      'COMPLETED': { label: '✅ COMPLETED', class: 'bg-success-50 text-success-600' },
      'ENDED': { label: '✅ COMPLETED', class: 'bg-success-50 text-success-600' },
      'CANCELLED': { label: '❌ CANCELLED', class: 'bg-gray-100 text-gray-600' }
    }
    return badges[status] || badges['UPCOMING']
  }

  const statusBadge = getStatusBadge(auction.status)
  const isLive = auction.status === 'LIVE'
  const isEnded = auction.status === 'COMPLETED' || auction.status === 'ENDED'
  const isCancelled = auction.status === 'CANCELLED'
  const isClosed = isEnded || isCancelled
  const isCreator = String(auction?.createdBy?._id || auction?.createdBy) === String(user?._id)

  const registrationStart = auction?.registrationsStartTime ? new Date(auction.registrationsStartTime) : null
  const auctionStart = auction?.startTime ? new Date(auction.startTime) : null
  const auctionEnd = auction?.endTime ? new Date(auction.endTime) : null

  const countdownLabel = (() => {
    if (!registrationStart || !auctionStart || !auctionEnd || isClosed) return 'Time Remaining'
    if (now < registrationStart) return 'Registration Starts In'
    if (now >= registrationStart && now < auctionStart) return 'Registration Ends In'
    return 'Auction Ends In'
  })()

  const countdownDate = (() => {
    if (!registrationStart || !auctionStart || !auctionEnd || isClosed) return null
    if (now < registrationStart) return registrationStart
    if (now >= registrationStart && now < auctionStart) return auctionStart
    return auctionEnd
  })()
  const canEditAuction = isCreator && auction?.status === 'UPCOMING' && registrationStart && isNaN(registrationStart.getTime()) === false && now < registrationStart
  const canBuyNow = !isCreator && auction.status === 'UPCOMING' && Boolean(auction.buyItNow) && registrationStart && now < registrationStart
  const canShowAutobidForm = isRegistered && ((auction.status === 'LIVE') || (auction.status === 'UPCOMING' && registrationStart && now >= registrationStart && now < auctionStart))
  const winnerId = auction?.auctionWinner?._id || auction?.auctionWinner || auction?.currentWinner?._id || auction?.currentWinner
  const winnerName = auction?.auctionWinner?.fullname || auction?.auctionWinner?.username || auction?.currentWinner?.fullname || auction?.currentWinner?.username || 'Winner'
  const isWinner = String(winnerId || '') === String(user?._id || '')
  const canPayWinningAmount = isEnded && isWinner && !paymentStatus?.hasWinningPayment && !paymentStatus?.hasBuyNowPayment
  const galleryImages = Array.isArray(auction?.product?.images) ? auction.product.images : []
  const selectedImage = galleryImages[selectedImageIndex] || galleryImages[0] || 'https://via.placeholder.com/600x400'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Message Toast */}
      {message && (
        <div className={`fixed top-4 right-4 max-w-md mx-4 p-4 rounded-lg shadow-lg flex gap-3 z-50 ${
          messageType === 'success' ? 'bg-success-50 text-success-600 border border-success-200' :
          messageType === 'error' ? 'bg-danger-50 text-danger-600 border border-danger-200' :
          'bg-primary-50 text-primary-600 border border-primary-200'
        }`}>
          {messageType === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <p>{message}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{auction.title}</h1>
            <span className={`badge ${statusBadge.class} text-lg`}>{statusBadge.label}</span>
          </div>
          <p className="text-gray-600 text-lg">{auction.product?.category}</p>
          <p className="text-sm text-gray-600 mt-2">
            Created by{' '}
            <button
              onClick={() => navigate(`/profile/${auction?.createdBy?._id || auction?.createdBy}`)}
              className="text-primary-600 font-semibold hover:underline"
            >
              {auction?.createdBy?.fullname || auction?.createdBy?.username || 'Seller'}
            </button>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Product Image */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <img
                src={selectedImage}
                alt={auction.title}
                className="w-full h-96 object-cover rounded-lg"
              />
              {galleryImages.length > 1 && (
                <div className="grid grid-cols-5 gap-3 mt-4">
                  {galleryImages.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`rounded-lg overflow-hidden border-2 ${selectedImageIndex === index ? 'border-primary-600' : 'border-transparent'}`}
                    >
                      <img src={imageUrl} alt={`Auction image ${index + 1}`} className="w-full h-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={handleToggleSaveAuction}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 border-2 rounded-lg transition-colors font-semibold ${
                    isSaved
                      ? 'border-success-600 text-success-600 bg-success-50 hover:bg-success-100'
                      : 'border-primary-600 text-primary-600 hover:bg-primary-50'
                  }`}
                >
                  <Heart className="w-5 h-5" />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold">
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Item</h2>
              <p className="text-gray-700 leading-relaxed mb-6">{auction.product?.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Condition</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{auction.product?.condition}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="flex border-b border-gray-200">
                {['overview', 'history'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                      activeTab === tab
                        ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab === 'overview' ? 'Overview' : 'Bidding History'}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'overview' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-primary-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Starting Price</p>
                        <p className="text-2xl font-bold text-primary-600">₹{auction.startingPrice.toLocaleString()}</p>
                      </div>
                      <div className="bg-accent-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Min Increment</p>
                        <p className="text-2xl font-bold text-accent-600">₹{auction.minIncrement.toLocaleString()}</p>
                      </div>
                    </div>

                    {auction.buyItNow && (
                      <div className="bg-success-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Buy It Now</p>
                        <p className="text-2xl font-bold text-success-600">₹{auction.buyItNow.toLocaleString()}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-sm text-gray-600">Starts</p>
                        <p className="font-semibold text-gray-900">{format(new Date(auction.startTime), 'PPpp')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Ends</p>
                        <p className="font-semibold text-gray-900">{format(new Date(auction.endTime), 'PPpp')}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">Bidding history will be displayed here</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Bid Card */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
              <p className="text-primary-100 text-sm font-semibold uppercase tracking-wider mb-2">Current Bid</p>
              <p className="text-5xl font-bold mb-2">₹{(auction.currentBid || auction.startingPrice).toLocaleString()}</p>
              {auction.currentBid > 0 && (
                <div className="space-y-2 pt-4 border-t border-primary-400">
                  <div className="flex items-center justify-between">
                    <span>Total Bids:</span>
                    <span className="font-bold text-lg">{auction.totalBids}</span>
                  </div>
                  {auction.currentWinner && (
                    <div className="flex items-center justify-between">
                      <span>Leading Bidder:</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${auction?.currentWinner?._id || auction?.currentWinner}`)}
                        className="font-semibold truncate hover:underline"
                      >
                        {auction?.currentWinner?._id && String(auction.currentWinner._id) === String(user?._id)
                          ? 'You'
                          : (auction?.currentWinner?.fullname || auction?.currentWinner?.username || 'Bidder')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Registration Card - Show before auction starts */}
            {auction.status === 'UPCOMING' && !isCreator && new Date() >= new Date(auction.registrationsStartTime) && new Date() < new Date(auction.startTime) && (
              <div className="bg-gradient-to-br from-accent-600 to-accent-700 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-lg font-bold mb-3">Register for Auction</h3>
                <p className="text-accent-100 text-sm mb-4">
                  Registration Fee: ₹{(0.1 * auction.startingPrice).toLocaleString()}
                </p>
                {isRegistered ? (
                  <div className="flex items-center gap-2 bg-success-500 rounded-lg py-3 px-4">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Already Registered</span>
                  </div>
                ) : (
                  <button
                    onClick={handleRegisterClick}
                    disabled={registrationLoading}
                    className="w-full flex items-center justify-center gap-2 bg-white text-accent-700 font-bold py-3 px-4 rounded-lg hover:bg-accent-50 transition-colors disabled:opacity-50"
                  >
                    {registrationLoading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Register Now
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {canBuyNow && (
              <div className="bg-gradient-to-br from-success-600 to-success-700 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-lg font-bold mb-2">Buy It Now</h3>
                <p className="text-success-100 text-sm mb-4">Available only before registration starts</p>
                <p className="text-3xl font-bold mb-4">₹{auction.buyItNow.toLocaleString()}</p>
                <button
                  type="button"
                  onClick={handleBuyNowClick}
                  disabled={buyNowLoading}
                  className="w-full flex items-center justify-center gap-2 bg-white text-success-700 font-bold py-3 px-4 rounded-lg hover:bg-success-50 transition-colors disabled:opacity-50"
                >
                  {buyNowLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Buy It Now
                    </>
                  )}
                </button>
              </div>
            )}

            {canEditAuction && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-primary-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Manage Auction</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing((prev) => !prev)}
                    className="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700"
                  >
                    {isEditing ? 'Cancel Edit' : 'Edit Auction'}
                  </button>
                </div>

                {isEditing && (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    {!auction.isVerified && (
                      <>
                        <input name="title" value={editData.title} onChange={handleEditInputChange} className="input-field" placeholder="Auction title" required />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input name="productName" value={editData.productName} onChange={handleEditInputChange} className="input-field" placeholder="Product name" required />
                          <input name="productCategory" value={editData.productCategory} onChange={handleEditInputChange} className="input-field" placeholder="Category" required />
                        </div>
                        <select name="productCondition" value={editData.productCondition} onChange={handleEditInputChange} className="input-field">
                          <option value="new">New</option>
                          <option value="like new">Like New</option>
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                        </select>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input type="number" name="startingPrice" value={editData.startingPrice} onChange={handleEditInputChange} className="input-field" placeholder="Starting price" required />
                          <input type="number" name="minIncrement" value={editData.minIncrement} onChange={handleEditInputChange} className="input-field" placeholder="Min increment" required />
                          <input type="number" name="buyItNow" value={editData.buyItNow} onChange={handleEditInputChange} className="input-field" placeholder="Buy it now (optional)" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Replace Images (optional)</label>
                          <input type="file" multiple accept="image/*" onChange={handleEditImageChange} className="input-field" />
                        </div>
                      </>
                    )}
                    <textarea name="description" value={editData.description} onChange={handleEditInputChange} className="input-field resize-none" rows="3" placeholder="Description" required />
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Registration Start Time</label>
                        <input type="datetime-local" name="registrationsStartTime" value={editData.registrationsStartTime} onChange={handleEditInputChange} className="input-field" min={getMinDateTimeLocal()} required />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Auction Start Time</label>
                        <input type="datetime-local" name="startTime" value={editData.startTime} onChange={handleEditInputChange} className="input-field" min={getMinDateTimeLocal()} required />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Auction End Time</label>
                        <input type="datetime-local" name="endTime" value={editData.endTime} onChange={handleEditInputChange} className="input-field" min={getMinDateTimeLocal()} required />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="w-full py-3 rounded-lg bg-success-600 text-white font-semibold hover:bg-success-700 disabled:opacity-50"
                    >
                      {editLoading ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Time Remaining */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-accent-500" />
                <h3 className="text-lg font-bold text-gray-900">{countdownLabel}</h3>
              </div>
              {isEnded ? (
                <p className="text-lg font-semibold text-gray-700">Auction Completed</p>
              ) : isCancelled ? (
                <p className="text-lg font-semibold text-gray-700">Auction Cancelled</p>
              ) : (
                <p className="text-2xl font-bold text-accent-600">
                  {countdownDate ? formatDistanceToNow(countdownDate) : formatDistanceToNow(new Date(auction.endTime))}
                </p>
              )}
            </div>

            {/* Bidding Section */}
            {canShowAutobidForm && (
              <BidForm auctionId={auctionId} auction={auction} onBidSuccess={refreshUserBidDetails} />
            )}

            {isEnded && (
              <div className="bg-success-50 rounded-xl shadow-lg p-6 border-2 border-success-200">
                <h3 className="text-lg font-bold text-success-700 mb-4">Auction Completed</h3>
                {auction.auctionWinner && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Winner</p>
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${winnerId}`)}
                      className="text-xl font-bold text-success-700 mb-4 hover:underline"
                    >
                      {isWinner ? 'You Won!' : `${winnerName} won the auction`}
                    </button>
                    <p className="text-sm text-gray-600 mb-1">Final Price</p>
                    <p className="text-2xl font-bold text-success-600">₹{auction.finalPrice.toLocaleString()}</p>

                    {canPayWinningAmount && (
                      <button
                        type="button"
                        onClick={handleWinningPaymentClick}
                        disabled={winnerPaymentLoading}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {winnerPaymentLoading ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5" />
                            Pay Winning Amount
                          </>
                        )}
                      </button>
                    )}

                    {!canPayWinningAmount && isWinner && (paymentStatus?.hasWinningPayment || paymentStatus?.hasBuyNowPayment) && (
                      <button
                        type="button"
                        onClick={handleTrackDelivery}
                        disabled={deliveryLoading}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-accent-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
                      >
                        {deliveryLoading ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Loading delivery...
                          </>
                        ) : (
                          <>
                            <Eye className="w-5 h-5" />
                            Track Delivery
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {delivery && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-accent-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Delivery Tracking</h3>
                <p className="text-sm text-gray-600 mb-4">Current Status: <span className="font-semibold text-accent-700">{delivery.status.replaceAll('_', ' ')}</span></p>
                <div className="space-y-3">
                  {(delivery.timeline || []).slice().reverse().map((entry, index) => (
                    <div key={`${entry.status}-${index}-${entry.createdAt || ''}`} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-800">{entry.status.replaceAll('_', ' ')}</p>
                      {entry.note ? <p className="text-xs text-gray-600 mt-1">{entry.note}</p> : null}
                      {entry.createdAt ? <p className="text-xs text-gray-500 mt-1">{new Date(entry.createdAt).toLocaleString()}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Bid Info */}
            {userBid && (
              <div className="bg-gray-50 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Your Bid</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Current Bid</p>
                    <p className="text-2xl font-bold text-primary-600">₹{userBid.currentBid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Your Rank</p>
                    <p className="text-lg font-bold text-gray-900">#{userBid.rank}</p>
                  </div>
                  {userBid.isCurrentWinner && (
                    <div className="bg-success-50 rounded-lg p-3 text-success-700 text-sm font-semibold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      You're Leading!
                    </div>
                  )}
                  {userBid.isOutbidded && (
                    <div className="bg-danger-50 rounded-lg p-3 text-danger-700 text-sm font-semibold flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      You've Been Outbidded
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mt-12">
          <Leaderboard auctionId={auctionId} leaderboard={leaderboard} />
        </div>
      </div>
    </div>
  )
}