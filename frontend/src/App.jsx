import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { connectSocket, disconnectSocket } from './services/socket.js'
import { authAPI } from './services/api.js'
import { useAuthStore } from './store/index.js'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AuctionDetail from './pages/AuctionDetail.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import CreateAuction from './pages/CreateAuction.jsx'
import Profile from './pages/Profile.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'

function AdminProtectedRoute({ children }) {
  const adminToken = localStorage.getItem('adminToken')
  if (!adminToken) {
    return <Navigate to="/admin/login" replace />
  }
  return children
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const { setUser } = useAuthStore()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.me()
        if (response.data.success) {
          setUser(response.data.user)
          setIsLoggedIn(true)
          connectSocket()
        }
      } catch (error) {
        setIsLoggedIn(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    return () => {
      disconnectSocket()
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      connectSocket()
    } else {
      disconnectSocket()
    }
  }, [isLoggedIn])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-primary-50 to-accent-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-primary-600 border-r-2 mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Home />} />
        <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Login setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/register" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/verify" element={isLoggedIn ? <Navigate to="/dashboard" /> : <VerifyEmail setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={(
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          )}
        />

        {/* Protected routes */}
        {isLoggedIn ? (
          <Route element={<Layout setIsLoggedIn={setIsLoggedIn} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auction/:auctionId" element={<AuctionDetail />} />
            <Route path="/create-auction" element={<CreateAuction />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
          </Route>
        ) : null}

        <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/"} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App