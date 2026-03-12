import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../services/api'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await adminAPI.login(email, password)
      if (response.data.success && response.data.token) {
        localStorage.setItem('adminToken', response.data.token)
        navigate('/admin/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Admin login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Login</h1>
        {error ? <p className="mb-4 text-sm text-danger-600">{error}</p> : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="input-field" type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input-field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? 'Signing in...' : 'Login as Admin'}
          </button>
        </form>
      </div>
    </div>
  )
}