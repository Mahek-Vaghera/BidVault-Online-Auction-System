import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { authAPI } from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await authAPI.forgotPassword(email)
      if (response.data.success) {
        setSuccess('Password reset link sent to your email. Please check your inbox.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block w-16 h-16 bg-gradient-to-br from-primary-600 to-accent-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white font-bold text-3xl">B</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent mb-2">
            Forgot Password
          </h1>
          <p className="text-gray-600">Enter your email and we'll send you a reset link</p>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}