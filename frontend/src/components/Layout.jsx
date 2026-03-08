import { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, Home, Plus, User } from 'lucide-react'
import { authAPI } from '../services/api'
import { useAuthStore } from '../store'

export default function Layout({ setIsLoggedIn }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      logout()
      setIsLoggedIn(false)
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-accent-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                BidVault
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/dashboard" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">
                <Home className="w-5 h-5 inline mr-2" />
                Dashboard
              </Link>
              <Link to="/create-auction" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">
                <Plus className="w-5 h-5 inline mr-2" />
                Create Auction
              </Link>
            </nav>

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/profile" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                <User className="w-5 h-5 text-primary-600" />
                <span className="text-gray-700 font-medium">{user?.username}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-danger-50 text-danger-600 rounded-lg hover:bg-danger-100 transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-primary-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 border-t border-gray-200">
              <Link
                to="/dashboard"
                className="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/create-auction"
                className="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Create Auction
              </Link>
              <Link
                to="/profile"
                className="block px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                className="w-full text-left px-4 py-2 text-danger-600 hover:bg-danger-50 transition-colors"
              >
                Logout
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}