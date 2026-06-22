import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import UploadPage from './pages/UploadPage.jsx'
import ResultsPage from './pages/ResultsPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import { useListingStore } from './store/listingStore.jsx'

export default function App() {
  const location = useLocation()
  const { pendingListing, draftId } = useListingStore()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const showTabs = !['/results'].includes(location.pathname)

  return (
    <div className="min-h-screen max-w-md mx-auto bg-orange-50 min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-orange-100">
        <div className="px-5 py-4 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center shadow-md shadow-brand-500/30">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900 leading-none">RESELLAI</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Flip like a pro</p>
            </div>
          </NavLink>
          {location.pathname === '/results' && pendingListing && (
            <NavLink to="/dashboard" className="text-sm font-semibold text-brand-600 active:scale-95">
              Dashboard →
            </NavLink>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>

      {showTabs && (
        <nav className="sticky bottom-0 z-30 bg-white border-t border-orange-100 pb-[env(safe-area-inset-bottom)]">
          <div className="flex">
            <TabLink to="/" label="Upload" icon={UploadIcon} />
            <TabLink to="/dashboard" label="My Items" icon={ListIcon} />
          </div>
        </nav>
      )}
    </div>
  )
}

function TabLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
          isActive ? 'text-brand-600' : 'text-gray-400'
        }`
      }
    >
      <Icon />
      <span className="text-xs font-semibold">{label}</span>
    </NavLink>
  )
}

function UploadIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5m0 0L7.5 12M12 7.5v9" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}
