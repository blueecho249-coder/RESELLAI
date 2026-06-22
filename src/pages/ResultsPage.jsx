import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListingStore } from '../store/listingStore.jsx'
import { createItem, updateItem } from '../services/items.js'
import ListingChecklist from '../components/ListingChecklist.jsx'
import ExportModal from '../components/ExportModal.jsx'
import { PLATFORMS, getPlatform } from '../lib/platforms.js'

const CONFIDENCE_META = {
  high: { label: 'High confidence', color: 'bg-green-100 text-green-700', dot: 'bg-green-500', border: 'border-green-200' },
  medium: { label: 'Medium confidence', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', border: 'border-amber-200' },
  low: { label: 'Low confidence', color: 'bg-red-100 text-red-600', dot: 'bg-red-400', border: 'border-red-200' },
}

const GENERIC_CATEGORIES = new Set(['general', 'item', 'miscellaneous', 'general item'])

export default function ResultsPage() {
  const navigate = useNavigate()
  const { pendingListing, setListing } = useListingStore()

  const [title, setTitle] = useState(pendingListing?.title || '')
  const [description, setDescription] = useState(pendingListing?.description || '')
  const [price, setPrice] = useState(String(pendingListing?.price || ''))
  const [condition, setCondition] = useState(pendingListing?.condition || '')
  const [selectedPlatform, setSelectedPlatform] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)

  if (!pendingListing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-4">
        <div className="w-16 h-16 bg-orange-100 rounded-3xl flex items-center justify-center">
          <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.174 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-gray-900">No listing to show</p>
          <p className="text-sm text-gray-500 mt-1">Upload an item to generate a listing.</p>
        </div>
        <button onClick={() => navigate('/')} className="btn-primary !py-3 !px-6">Upload an item</button>
      </div>
    )
  }

  const conf = CONFIDENCE_META[pendingListing.confidence] || CONFIDENCE_META.low
  const priceNum = parseFloat(price) || 0

  async function handleSaveItem() {
    setSaving(true)
    try {
      const payload = {
        image_url: pendingListing.imageUrl,
        title,
        description,
        price: priceNum,
        category: pendingListing.category || 'General',
        condition,
        ai_confidence: pendingListing.confidence || 'low',
        confidence_level: pendingListing.confidence || 'low',
        notes: pendingListing.notes || [],
        price_range_low: pendingListing.priceRange?.low ?? null,
        price_range_high: pendingListing.priceRange?.high ?? null,
        requires_review: pendingListing.requiresReview ?? false,
        platform: selectedPlatform,
        status: 'not_listed',
        export_text: null,
      }
      const created = await createItem(payload)
      setSavedId(created.id)
      setListing({ ...pendingListing, id: created.id, title, description, price: priceNum, condition, platform: selectedPlatform })
      setTimeout(() => navigate('/dashboard'), 500)
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  function handlePlatformMarkListed(platform) {
    setSelectedPlatform(platform)
    if (savedId) updateItem(savedId, { platform, status: 'listed' }).catch(console.error)
  }

  const exportPayload = {
    title,
    description,
    price: priceNum,
    condition,
    category: pendingListing.category,
    confidence: pendingListing.confidence,
    notes: pendingListing.notes,
    requiresReview: pendingListing.requiresReview,
    priceRange: pendingListing.priceRange,
  }

  return (
    <div className="px-5 py-6 flex flex-col gap-5 animate-fade-in pb-10">

      {/* Image + confidence overlay */}
      <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-md">
        <img src={pendingListing.imageUrl} alt={title} className="w-full h-full object-cover" />
        {/* Bottom gradient for readability */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm border ${conf.color} ${conf.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
            {conf.label}
          </span>
        </div>
        {/* Category pill — only shown when AI identified something specific */}
        {pendingListing.category && !GENERIC_CATEGORIES.has(pendingListing.category.toLowerCase()) && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-xs font-bold text-white">{pendingListing.category}</span>
          </div>
        )}
        {/* Source badge at bottom */}
        <div className="absolute bottom-3 left-3">
          {pendingListing.source === 'gemini' && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-600/85 text-white backdrop-blur-sm">
              <EyeIcon /> Gemini Vision
            </span>
          )}
          {pendingListing.source === 'vision+gemini' && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-600/85 text-white backdrop-blur-sm">
              <EyeIcon /> Vision + Gemini
            </span>
          )}
          {pendingListing.source === 'vision' && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-600/85 text-white backdrop-blur-sm">
              <EyeIcon /> Cloud Vision
            </span>
          )}
          {pendingListing.source === 'fallback' && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/50 text-white/80 backdrop-blur-sm">
              Keyword analysis
            </span>
          )}
        </div>
      </div>

      {/* Detected features — what the AI actually saw */}
      {pendingListing.detectedFeatures?.length > 0 && (
        <div className="card !p-4 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <EyeIconSm />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">What the AI saw</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingListing.detectedFeatures.map((f, i) => (
              <span key={i} className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source explainer — only shown for fallback */}
      {pendingListing.source === 'fallback' && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 animate-slide-up">
          <InfoCircleIcon />
          <div>
            <p className="text-sm font-bold text-blue-800">Generated from filename</p>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              AI vision is not configured. This listing was generated from the filename — review and edit every field to make sure it matches your item.
            </p>
          </div>
        </div>
      )}

      {/* Review warning banner */}
      {pendingListing.requiresReview && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 animate-slide-up">
          <WarningIcon />
          <div>
            <p className="text-sm font-bold text-amber-800">Review before posting</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Confidence is <strong>{pendingListing.confidence}</strong>. Edit the title, description, and price below to make sure everything is accurate before you list.
            </p>
          </div>
        </div>
      )}

      {/* Editable listing fields — always shown, no toggle */}
      <div className="card flex flex-col gap-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Listing Details</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
            Edit freely
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for this item…"
            className="input font-semibold"
          />
          <p className="text-[11px] text-gray-400">Include brand + model + colorway if you know them.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Describe the item honestly…"
            className="input resize-none leading-relaxed"
          />
          <p className="text-[11px] text-gray-400">Be honest about condition — buyers notice inaccuracies.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Condition</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className="input">
            {pendingListing.conditionOptions ? pendingListing.conditionOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            )) : [
              'New / Deadstock', 'New / Unworn', 'Like New',
              'Used – Excellent', 'Used – Good', 'Used – Fair',
            ].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Price */}
      <div className="card animate-slide-up bg-gradient-to-br from-brand-50 to-orange-50 !border-brand-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1.5">Your Price</p>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input !pl-7 text-2xl font-bold !bg-white/80"
              />
            </div>
          </div>
          <div className="text-right shrink-0 pt-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Suggested</p>
            <p className="text-sm font-bold text-gray-700 mt-0.5">
              ${pendingListing.priceRange?.low}–${pendingListing.priceRange?.high}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-brand-100 flex items-start gap-2 text-xs text-gray-500">
          <InfoIcon />
          <span>
            Based on similar sold items. Actual value depends on brand, size, and current demand — verify on eBay sold listings.
          </span>
        </div>
      </div>

      {/* Similar items */}
      {pendingListing.similarItems?.length > 0 && (
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm">Simulated Comps</h3>
            <span className="text-[10px] text-gray-400 font-medium">Example data only</span>
          </div>
          <div className="flex flex-col gap-2">
            {pendingListing.similarItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-orange-50 rounded-2xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <PlatformDot platform={item.platform} />
                  <span className="text-sm font-medium text-gray-700 capitalize">{item.platform}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">${item.price}</span>
                  <span className="text-xs text-gray-400">{item.soldDays}d ago</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2.5">
            Always check actual sold listings before pricing. Search eBay Sold for the most accurate comps.
          </p>
        </div>
      )}

      {/* AI Notes — things to verify */}
      {pendingListing.notes?.length > 0 && (
        <div className="card animate-slide-up !border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="font-bold text-amber-900 text-sm">Things to verify before posting</h3>
          </div>
          <ul className="flex flex-col gap-2">
            {pendingListing.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Checklist */}
      <ListingChecklist item={{ title, description, price: priceNum, imageUrl: pendingListing.imageUrl, platform: selectedPlatform, status: 'not_listed' }} />

      {/* Platform picker */}
      <div className="card animate-slide-up">
        <h3 className="font-bold text-gray-900 text-sm mb-3">Choose a Platform</h3>
        <div className="flex flex-col gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelectedPlatform(p.id); setShowExport(true) }}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                selectedPlatform === p.id
                  ? `${p.bgColor} ${p.borderColor}`
                  : 'border-orange-100 hover:border-orange-200'
              }`}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: p.color }}>
                {p.icon}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                <p className="text-xs text-gray-500">{p.hint}</p>
              </div>
              {selectedPlatform === p.id && (
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full shrink-0">Chosen</span>
              )}
            </button>
          ))}
        </div>
        {selectedPlatform && (
          <button onClick={() => setShowExport(true)} className="btn-primary w-full mt-3 flex items-center justify-center gap-2">
            <CopyIcon /> Copy Listing to {getPlatform(selectedPlatform)?.name}
          </button>
        )}
      </div>

      {/* Save CTA */}
      <button
        onClick={handleSaveItem}
        disabled={saving || !title.trim() || priceNum <= 0}
        className="btn-primary w-full !bg-green-500 hover:!bg-green-600 shadow-green-500/30 flex items-center justify-center gap-2"
      >
        {saving ? <><Spinner /> Saving…</> : <><CheckIcon /> Save to My Items</>}
      </button>
      {(!title.trim() || priceNum <= 0) && (
        <p className="text-center text-xs text-gray-400 -mt-3">Add a title and price before saving.</p>
      )}

      {showExport && (
        <ExportModal
          item={exportPayload}
          selectedPlatform={selectedPlatform}
          onClose={() => setShowExport(false)}
          onPlatformChange={setSelectedPlatform}
          onListed={handlePlatformMarkListed}
        />
      )}
    </div>
  )
}

function EyeIconSm() {
  return (
    <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function InfoCircleIcon() {
  return (
    <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

function PlatformDot({ platform }) {
  const colors = { ebay: '#e53238', depop: '#ff2300', poshmark: '#820f7e' }
  return <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[platform] || '#999' }} />
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
