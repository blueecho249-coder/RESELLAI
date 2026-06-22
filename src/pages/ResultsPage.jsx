import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListingStore } from '../store/listingStore.jsx'
import { createItem, updateItem } from '../services/items.js'
import ListingChecklist from '../components/ListingChecklist.jsx'
import ExportModal from '../components/ExportModal.jsx'
import { PLATFORMS, getPlatform } from '../lib/platforms.js'

export default function ResultsPage() {
  const navigate = useNavigate()
  const { pendingListing, setListing, clear } = useListingStore()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(pendingListing?.title || '')
  const [description, setDescription] = useState(pendingListing?.description || '')
  const [price, setPrice] = useState(pendingListing?.price || 0)
  const [showExport, setShowExport] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState(pendingListing?.platform || null)
  const [savedItemId, setSavedItemId] = useState(pendingListing?.id || null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!pendingListing?.id)

  if (!pendingListing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-4">
        <p className="text-gray-500">No listing yet.</p>
        <button onClick={() => navigate('/')} className="btn-primary">Upload an item</button>
      </div>
    )
  }

  const listing = { ...pendingListing, title, description, price }

  function handleSaveEdits() {
    setListing({ ...pendingListing, title, description, price })
    setEditing(false)
  }

  async function handleSaveItem() {
    setSaving(true)
    try {
      const payload = {
        image_url: pendingListing.imageUrl,
        title,
        description,
        price: Number(price),
        category: pendingListing.category || 'General',
        condition: pendingListing.condition || 'Gently Used',
        ai_confidence: pendingListing.aiConfidence || null,
        platform: selectedPlatform,
        status: selectedPlatform ? 'listed' : 'not_listed',
      }
      const created = await createItem(payload)
      setSavedItemId(created.id)
      setSaved(true)
      setListing({ ...pendingListing, id: created.id, title, description, price, platform: selectedPlatform })
      setTimeout(() => navigate('/dashboard'), 600)
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  function handlePlatformMarkListed(platform) {
    setSelectedPlatform(platform)
    setListing({ ...pendingListing, title, description, price, platform, id: savedItemId, status: 'listed' })
    if (savedItemId) {
      updateItem(savedItemId, { platform, status: 'listed' })
    }
  }

  function handleEditPrice(delta) {
    setPrice((p) => Math.max(0, Math.round((Number(p) + delta) * 100) / 100))
  }

  const platform = selectedPlatform ? getPlatform(selectedPlatform) : null

  return (
    <div className="px-5 py-6 flex flex-col gap-5 animate-fade-in">
      {/* Hero image */}
      <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-md">
        <img src={pendingListing.imageUrl} alt={title} className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full">
          <span className="text-xs font-bold text-brand-600 flex items-center gap-1">
            <Sparkle /> AI Generated
          </span>
        </div>
        {pendingListing.aiConfidence && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
            <span className="text-xs font-bold text-white">{pendingListing.aiConfidence} confidence</span>
          </div>
        )}
      </div>

      {/* Title section */}
      <div className="card animate-slide-up">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5">
            <Badge color="brand">{pendingListing.category}</Badge>
            <Badge color="green">{pendingListing.condition}</Badge>
          </div>
          <button
            onClick={() => setEditing((e) => !e)}
            className="text-xs font-semibold text-brand-600 active:scale-95 shrink-0"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input !py-2 !px-3 text-base font-bold mb-3"
          />
        ) : (
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{title}</h2>
        )}

        {editing ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="input !py-2 !px-3 text-sm resize-none mt-2"
          />
        ) : (
          <p className="text-sm text-gray-600 leading-relaxed mt-2">{description}</p>
        )}

        {editing && (
          <button onClick={handleSaveEdits} className="btn-primary mt-3 !py-2.5 text-sm">
            Save Changes
          </button>
        )}
      </div>

      {/* Price card */}
      <div className="card animate-slide-up bg-gradient-to-br from-brand-50 to-orange-50 !border-brand-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-bold text-brand-600 uppercase tracking-wider">Suggested Price</p>
            <p className="text-3xl font-bold text-gray-900 mt-0.5">
              ${Number(price).toFixed(2)}
            </p>
          </div>
          {editing && (
            <div className="flex flex-col gap-1.5">
              <button onClick={() => handleEditPrice(5)} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-orange-200 active:scale-90">
                <Chevron up />
              </button>
              <button onClick={() => handleEditPrice(-5)} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-orange-200 active:scale-90">
                <Chevron />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <InfoIcon />
          <span>
            Based on {pendingListing.similarItems?.length || 3} similar items (${pendingListing.priceRange?.low}–${pendingListing.priceRange?.high} range)
          </span>
        </div>
      </div>

      {/* Similar items */}
      {pendingListing.similarItems?.length > 0 && (
        <div className="card animate-slide-up">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Similar Sold Items</h3>
          <div className="flex flex-col gap-2">
            {pendingListing.similarItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-orange-50 rounded-2xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <PlatformDot platform={item.platform} />
                  <span className="text-sm font-medium text-gray-700 capitalize">{item.platform}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">${item.price}</span>
                  <span className="text-xs text-gray-400">sold {item.soldDays}d ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist */}
      <ListingChecklist item={{ ...listing, platform: selectedPlatform, status: selectedPlatform ? 'listed' : 'not_listed' }} />

      {/* Platform action */}
      <div className="card animate-slide-up">
        <h3 className="font-bold text-gray-900 text-sm mb-3">Choose a Platform</h3>
        <div className="flex flex-col gap-2 mb-4">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPlatform(p.id)
                setShowExport(true)
              }}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                selectedPlatform === p.id
                  ? `${p.bgColor} ${p.borderColor}`
                  : 'border-orange-100 hover:border-orange-200'
              }`}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: p.color }}>
                {p.icon}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                <p className="text-xs text-gray-500">{p.hint}</p>
              </div>
              {selectedPlatform === p.id && (
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Chosen</span>
              )}
            </button>
          ))}
        </div>
        {platform && (
          <button onClick={() => setShowExport(true)} className="btn-primary w-full flex items-center justify-center gap-2">
            <CopyIcon /> Copy Listing to {platform.name}
          </button>
        )}
      </div>

      <button onClick={handleSaveItem} disabled={saving} className="btn-primary w-full !bg-green-500 hover:!bg-green-600 shadow-green-500/30 flex items-center justify-center gap-2">
        {saving ? (
          <>
            <Spinner /> Saving…
          </>
        ) : saved ? (
          <>
            <CheckIcon /> Saved to Dashboard
          </>
        ) : (
          <>Save to My Items</>
        )}
      </button>
    </div>
  )
}

function Badge({ children, color }) {
  const map = {
    brand: 'bg-brand-100 text-brand-700',
    green: 'bg-green-100 text-green-700',
  }
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${map[color]}`}>{children}</span>
}

function Chevron({ up }) {
  return (
    <svg className={`w-4 h-4 text-gray-600 ${up ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

function Sparkle() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 3.625V4.875c0-.621-.504-1.125-1.125-1.125H16.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function PlatformDot({ platform }) {
  return (
    <div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: platform === 'ebay' ? '#e53238' : platform === 'depop' ? '#ff2300' : '#820f7e' }}
    />
  )
}
