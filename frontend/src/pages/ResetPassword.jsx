import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { authAPI } from '../services/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const emailFromUrl = searchParams.get('email') || ''
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: emailFromUrl,
    newPassword: '',
    confirmNewPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (formData.newPassword !== formData.confirmNewPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const response = await authAPI.resetPassword(
        formData.email,
        token,
        formData.newPassword,
        formData.confirmNewPassword
      )
      if (response.data.success) {
        setSuccess('Password reset successful! Redirecting to login...')
        setTimeout(() => navigate('/login'), 2000)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-danger-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-4">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-primary-600 font-semibold hover:text-primary-700">
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block w-16 h-16 bg-gradient-to-br from-primary-600 to-accent-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <Lock className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600">Enter your new password below</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
              <p className="text-danger-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg flex gap-3">
              <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
              <p className="text-success-600 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="confirmNewPassword"
                  value={formData.confirmNewPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-6"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}