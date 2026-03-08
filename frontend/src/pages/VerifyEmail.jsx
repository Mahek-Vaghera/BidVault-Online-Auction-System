import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react'
import { authAPI } from '../services/api'
import { useAuthStore } from '../store'

export default function VerifyEmail({ setIsLoggedIn }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const { pendingEmail, setUser } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (code.length !== 6) {
      setError('Please enter a 6-digit verification code')
      return
    }

    setLoading(true)

    try {
      const response = await authAPI.verifyEmail(pendingEmail, code)
      if (response.data.success) {
        setSuccess('Email verified successfully! Redirecting...')
        setUser(response.data.user)
        setIsLoggedIn(true)
        setTimeout(() => navigate('/dashboard'), 1500)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!pendingEmail) {
      setError('No email found for verification. Please sign up again.')
      return
    }
    setResending(true)
    setError('')
    setSuccess('')
    try {
      const response = await authAPI.resendVerification(pendingEmail)
      if (response.data.success) {
        setSuccess('A new verification code has been sent to your email.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend verification code')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block w-16 h-16 bg-gradient-to-br from-primary-600 to-accent-500 rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600">
            We sent a 6-digit code to <strong>{pendingEmail || 'your email'}</strong>
          </p>
        </div>

        {/* Form Card */}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setCode(val)
                }}
                placeholder="Enter 6-digit code"
                className="input-field text-center text-2xl tracking-[0.5em] font-bold"
                maxLength={6}
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Check your inbox and spam folder
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn-primary w-full text-lg py-3"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="text-primary-600 font-semibold hover:text-primary-700 disabled:opacity-50"
              >
                {resending ? 'Resending...' : 'Resend code'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}