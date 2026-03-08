import { Link } from 'react-router-dom'
import { Gavel, Shield, Zap, TrendingUp, Users, Clock } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="bg-gradient-to-br from-primary-700 via-primary-600 to-accent-500 text-white">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-2xl font-bold">BidVault</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="px-5 py-2 text-white font-semibold hover:bg-white/10 rounded-lg transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="px-5 py-2 bg-white text-primary-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg">
              Sign Up
            </Link>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            The Future of
            <span className="block text-accent-300">Online Auctions</span>
          </h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-10">
            Discover, bid, and win amazing items in real-time. BidVault brings 
            transparent, secure, and exciting auction experiences to everyone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="px-8 py-4 bg-accent-500 text-white font-bold rounded-xl text-lg hover:bg-accent-600 transition-colors shadow-xl">
              Get Started Free
            </Link>
            <Link to="/login" className="px-8 py-4 bg-white/10 text-white font-bold rounded-xl text-lg hover:bg-white/20 transition-colors backdrop-blur border border-white/20">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Why BidVault?</h2>
          <p className="text-gray-600 text-center mb-12 max-w-xl mx-auto">
            Built for both sellers and buyers with cutting-edge real-time technology
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Real-Time Bidding', desc: 'Powered by WebSocket for instant bid updates. Never miss a moment.' },
              { icon: Shield, title: 'Secure & Transparent', desc: 'Every bid is logged and verified. Fair auctions guaranteed.' },
              { icon: TrendingUp, title: 'Auto-Bid System', desc: 'Set your max limit and let our system bid for you automatically.' },
              { icon: Users, title: 'Live Leaderboard', desc: 'See top bidders in real-time. Track your rank instantly.' },
              { icon: Clock, title: 'Smart Extensions', desc: 'Last-minute bids extend the auction to keep things fair.' },
              { icon: Gavel, title: 'Easy Auctions', desc: 'Create and manage auctions with product images and custom timelines.' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-accent-500 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Bidding?</h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of users on BidVault. Create your account in seconds.
          </p>
          <Link to="/register" className="inline-block px-10 py-4 bg-white text-primary-700 font-bold rounded-xl text-lg hover:bg-gray-100 transition-colors shadow-xl">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} BidVault. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}