import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, AlertCircle, CheckCircle } from 'lucide-react'
import { auctionAPI } from '../services/api'

export default function CreateAuction() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    productName: '',
    productCategory: '',
    productCondition: 'new',
    productDescription: '',
    startingPrice: '',
    minIncrement: '',
    buyItNow: '',
    startTime: '',
    endTime: '',
    registrationsStartTime: ''
  })
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const getMinDateTimeLocal = () => {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    setImages(files)
  }

  const submitAuction = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const now = new Date()
      const regStart = new Date(formData.registrationsStartTime)
      const start = new Date(formData.startTime)
      const end = new Date(formData.endTime)

      if (regStart < now || start < now || end < now) {
        setError('Auction timeline cannot be in the past')
        setLoading(false)
        return
      }

      const formDataToSend = new FormData()
      
      Object.keys(formData).forEach((key) => {
        if (
          key === 'registrationsStartTime' ||
          key === 'startTime' ||
          key === 'endTime'
        ) {
          formDataToSend.append(
            key,
            new Date(formData[key]).toISOString()
          )
        } else {
          formDataToSend.append(key, formData[key])
        }
      })
      images.forEach((image) => {
        formDataToSend.append('images', image)
      })

      const response = await auctionAPI.create(formDataToSend)
      if (response.data.success) {
        setSuccess('Auction created successfully! Redirecting to your auctions...')
        setTimeout(() => navigate('/profile?tab=my-auctions'), 1200)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create auction')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const now = new Date()
    const regStart = new Date(formData.registrationsStartTime)
    const start = new Date(formData.startTime)
    const end = new Date(formData.endTime)

    if (regStart < now || start < now || end < now) {
      setError('Auction timeline cannot be in the past')
      return
    }
    setShowConfirm(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Auction</h1>
        <p className="text-gray-600 mb-8">List your items and start auctioning</p>

        <div className="bg-white rounded-xl shadow-lg p-8">
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
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Auction Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="E.g., Vintage Apple iPhone"
                className="input-field"
                required
              />
            </div>

            {/* Product Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category *
                </label>
                <input
                  type="text"
                  name="productCategory"
                  value={formData.productCategory}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Condition *
              </label>
              <select
                name="productCondition"
                value={formData.productCondition}
                onChange={handleChange}
                className="input-field"
              >
                <option value="new">New</option>
                <option value="like new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="productDescription"
                value={formData.productDescription}
                onChange={handleChange}
                placeholder="Describe your product in detail..."
                className="input-field resize-none"
                rows="4"
                required
              />
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Images *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="images"
                  required
                />
                <label htmlFor="images" className="cursor-pointer">
                  <p className="text-gray-700 font-semibold">Click to upload or drag and drop</p>
                  <p className="text-gray-500 text-sm">PNG, JPG up to 5 images</p>
                </label>
                {images.length > 0 && (
                  <p className="text-primary-600 text-sm mt-2">{images.length} image(s) selected</p>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Starting Price *
                </label>
                <input
                  type="number"
                  name="startingPrice"
                  value={formData.startingPrice}
                  onChange={handleChange}
                  placeholder="0"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Min Increment *
                </label>
                <input
                  type="number"
                  name="minIncrement"
                  value={formData.minIncrement}
                  onChange={handleChange}
                  placeholder="0"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Buy It Now
                </label>
                <input
                  type="number"
                  name="buyItNow"
                  value={formData.buyItNow}
                  onChange={handleChange}
                  placeholder="0"
                  className="input-field"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-gray-900">Auction Timeline</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Registration Starts *
                </label>
                <input
                  type="datetime-local"
                  name="registrationsStartTime"
                  value={formData.registrationsStartTime}
                  onChange={handleChange}
                  className="input-field"
                  min={getMinDateTimeLocal()}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Auction Starts *
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="input-field"
                  min={getMinDateTimeLocal()}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Auction Ends *
                </label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="input-field"
                  min={getMinDateTimeLocal()}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-lg py-3"
            >
              {loading ? 'Creating Auction...' : 'Create Auction'}
            </button>
          </form>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Confirm Auction Creation</h2>
              <p className="text-gray-600 text-sm mb-6">
                After creating this auction, it will appear in My Auctions under verification until admin approval.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowConfirm(false)
                    await submitAuction()
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}