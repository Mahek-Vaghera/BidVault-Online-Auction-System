import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/bidvault'

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
})

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, username, password) => api.post('/auth/register', { email, username, password }),
  verifyEmail: (email, code) => api.post('/auth/verify-email', { email, code }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  getProfile: (userId) => api.get(`/auth/profile/${userId}`),
  getMyActivity: (skip = 0, limit = 10) => api.get('/auth/my-activity', { params: { skip, limit } }),
  updateAddress: (address) => api.put('/auth/address', address),
  getMyAuctions: () => api.get('/auth/my-auctions'),
  getSavedAuctions: () => api.get('/auth/saved-auctions'),
  getWinningAuctions: () => api.get('/auth/winning-auctions'),
  forgotPassword: (email) => api.post('/auth/forget-pwd-email', { email }),
  resetPassword: (email, token, newPassword, confirmNewPassword) => api.post('/auth/reset-pwd', { email, token, newPassword, confirmNewPassword }),
}

// Auction APIs
export const auctionAPI = {
  stats: () => api.get('/auctions/stats'),
  list: (status, page = 1) => api.get('/auctions', { params: { status, page } }),
  getOne: (auctionId) => api.get(`/auctions/${auctionId}`),
  create: (data) => api.post('/auctions/create', data),
  edit: (auctionId, data) => api.patch(`/auctions/${auctionId}`, data),
  delete: (auctionId) => api.delete(`/auctions/${auctionId}`),
  register: (auctionId) => api.post(`/auctions/${auctionId}/register`),
  verifyRegistrationPayment: (auctionId, paymentData) => api.post(`/auctions/${auctionId}/verify-registration-payment`, paymentData),
  pay: (auctionId) => api.post(`/auctions/${auctionId}/pay`),
  verifyWinningPayment: (auctionId, paymentData) => api.post(`/auctions/${auctionId}/verify-winning-payment`, paymentData),
  buyNow: (auctionId) => api.post(`/auctions/${auctionId}/buy-now`),
  verifyBuyNowPayment: (auctionId, paymentData) => api.post(`/auctions/${auctionId}/verify-buy-now-payment`, paymentData),
  toggleSave: (auctionId) => api.post(`/auctions/${auctionId}/save`),
  getMyDeliveryForAuction: (auctionId) => api.get(`/auctions/${auctionId}/delivery`),
}

// Bid APIs
export const bidAPI = {
  placeBid: (auctionId, bidAmount) => api.post(`/auctions/${auctionId}/bid`, { bidAmount }),
  setAutobid: (auctionId, maxLimit) => api.post(`/auctions/${auctionId}/autobid`, { maxLimit }),
  getMyAutobid: (auctionId) => api.get(`/auctions/${auctionId}/autobid/me`),
  editAutobid: (auctionId, autobidId, maxLimit) => api.patch(`/auctions/${auctionId}/autobid/${autobidId}`, { maxLimit }),
  deactivateAutobid: (auctionId, autobidId) => api.post(`/auctions/${auctionId}/autobid/${autobidId}/deactivate`),
  activateAutobid: (auctionId, autobidId) => api.post(`/auctions/${auctionId}/autobid/${autobidId}/activate`),
}

// Leaderboard APIs
export const leaderboardAPI = {
  getLeaderboard: (auctionId) => api.get(`/auctions/${auctionId}/leaderboard`),
  getHistory: (auctionId, page = 1, limit = 20) => api.get(`/auctions/${auctionId}/history`, { params: { page, limit } }),
  getUserBidDetails: (auctionId) => api.get(`/auctions/${auctionId}/my-bid`),
}

const adminApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
})

const adminHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}`,
})

export const adminAPI = {
  login: (email, password) => adminApi.post('/admin/login', { email, password }),
  logout: () => adminApi.post('/admin/logout', {}, { headers: adminHeaders() }),
  overview: () => adminApi.get('/admin/overview', { headers: adminHeaders() }),
  getPendingAuctions: () => adminApi.get('/admin/auctions/pending', { headers: adminHeaders() }),
  getLiveAuctions: () => adminApi.get('/admin/auctions/live', { headers: adminHeaders() }),
  verifyAuction: (auctionId, verified = true) => adminApi.post(`/admin/auctions/${auctionId}/verify`, { verified }, { headers: adminHeaders() }),
  getDeliveries: (status) => adminApi.get('/admin/deliveries', { headers: adminHeaders(), params: status ? { status } : {} }),
  updateDeliveryStatus: (deliveryId, status, note = '') => adminApi.patch(`/admin/deliveries/${deliveryId}/status`, { status, note }, { headers: adminHeaders() }),
  getNotifications: () => adminApi.get('/admin/notifications', { headers: adminHeaders() }),
  getPayments: (params = {}) => adminApi.get('/admin/payments', { headers: adminHeaders(), params }),
}

export default api