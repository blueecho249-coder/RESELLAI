import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadImage } from '../services/items.js'
import { useListingStore } from '../store/listingStore.jsx'
import { generateListing } from '../lib/aiGenerator.js'
import { analyzeImageForListing, isVisionReady } from '../lib/visionService.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function callAnalyzeImage(imageUrl, file) {
  try {
    // Try local vision analysis first (TensorFlow COCO-SSD)
    const visionReady = await isVisionReady()
    if (visionReady && file) {
      console.log('Using local vision analysis...')
      const visionResult = await analyzeImageForListing(file)
      if (visionResult.success) {
        // Build a complete listing from the filename so price/priceRange/
        // notes/conditionOptions are all populated, then overlay the real
        // vision detections on top.
        const base = generateListing(file.name)
        return {
          ...base,
          title: visionResult.detectedItem
            ? `${visionResult.detectedItem.charAt(0).toUpperCase()}${visionResult.detectedItem.slice(1)}`
            : base.title,
          category: visionResult.category || base.category,
          brand: visionResult.brandHints?.[0] || base.brand,
          condition: visionResult.condition || base.condition,
          confidence: visionResult.confidence || base.confidence,
          requiresReview: (visionResult.confidence || base.confidence) !== 'high',
          detectedFeatures: visionResult.notes || [],
          source: 'local-vision',
        }
      }
    }
  } catch (err) {
    console.warn('Local vision analysis failed:', err.message)
  }

  // Fallback to Supabase function
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ imageUrl }),
    })

    if (res.status === 503) return null
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || `Analysis error (${res.status})`)
    }

    const data = await res.json()
    if (!data.title || !data.description || !data.confidence) {
      throw new Error('Unexpected response from image analysis API')
    }
    return { ...data, source: 'supabase' }
  } catch (err) {
    console.warn('Supabase vision API failed:', err.message)
    return null
  }
}

const PHASES = [
  { id: 'uploading', label: 'Uploading photo' },
  { id: 'analyzing', label: 'Analyzing image…' },
  { id: 'detecting', label: 'Detecting item type' },
  { id: 'listing', label: 'Generating listing' },
]

export default function UploadPage() {
  const navigate = useNavigate()
  const { setListing } = useListingStore()
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [detectedLabel, setDetectedLabel] = useState(null)
  const [error, setError] = useState(null)
  const [visionAvailable, setVisionAvailable] = useState(false)

  useEffect(() => {
    // Check if vision is ready on mount
    isVisionReady().then(setVisionAvailable).catch(() => setVisionAvailable(false))
  }, [])

  function handleFile(selected) {
    if (!selected) return
    if (!selected.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    setError(null)
    setFile(selected)
    setDetectedLabel(null)
    setPreview(URL.createObjectURL(selected))
  }

  function onInputChange(e) {
    handleFile(e.target.files?.[0])
  }
  function onDrop(e) {
    e.preventDefault()
    handleFile(e.dataTransfer.files?.[0])
  }

  async function handleGenerate() {
    if (!file) {
      setError('Add a photo first.')
      return
    }
    setError(null)
    setDetectedLabel(null)

    try {
      // Step 1 — upload
      setPhase('uploading')
      const { publicUrl, path } = await uploadImage(file)

      // Step 2 — vision analysis
      setPhase('analyzing')
      let ai = null

      try {
        ai = await callAnalyzeImage(publicUrl, file)

        if (ai) {
          // Step 3 — show detected category briefly
          setPhase('detecting')
          setDetectedLabel(
            ai.category && !['item', 'general'].includes(ai.category.toLowerCase())
              ? ai.category
              : ai.brand ?? ai.detectedItem ?? null
          )
          // Small pause so the user can read the "detected" label
          await new Promise((r) => setTimeout(r, 900))
        }
      } catch (visionErr) {
        console.warn('Vision API failed, using local fallback:', visionErr.message)
      }

      // Step 4 — build listing (fall back to local if vision unavailable)
      setPhase('listing')
      if (!ai) {
        ai = generateListing(file.name)
        ai.source = 'fallback'
      }
      await new Promise((r) => setTimeout(r, 400))

      setListing({ imageUrl: publicUrl, imageFilename: path, ...ai })
      setPhase('done')
      navigate('/results')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Check your connection and try again.')
      setPhase('idle')
    }
  }

  const busy = !['idle', 'done'].includes(phase)
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === phase)

  return (
    <div className="px-5 py-6 flex flex-col gap-6 animate-fade-in">
      <section className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Got something to flip?</h2>
        <p className="text-gray-500 text-sm mt-1">Snap a pic — AI reads the image directly.</p>
        {visionAvailable && (
          <p className="text-green-600 text-xs mt-2 font-semibold">✓ Vision AI enabled</p>
        )}
      </section>

      {/* Drop zone */}
      <div
        onClick={() => !busy && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`relative rounded-3xl border-2 border-dashed transition-all overflow-hidden aspect-[4/3] flex items-center justify-center ${
          busy ? 'cursor-default' : 'cursor-pointer'
        } ${preview ? 'border-brand-400 bg-white' : 'border-orange-300 bg-orange-50 hover:border-brand-400'}`}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Item preview"
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                busy ? 'opacity-50' : 'opacity-100'
              }`}
            />
            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] gap-3 px-6">
                <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center">
                  <Spinner />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-sm drop-shadow">
                    {phase === 'uploading' && 'Uploading photo…'}
                    {phase === 'analyzing' && 'Analyzing image…'}
                    {phase === 'detecting' && detectedLabel
                      ? `Detected: ${detectedLabel}`
                      : phase === 'detecting'
                      ? 'Detecting item type…'
                      : null}
                    {phase === 'listing' && 'Generating listing…'}
                  </p>
                  {phase === 'analyzing' && (
                    <p className="text-white/70 text-xs mt-1">Reading item, brand, condition…</p>
                  )}
                  {phase === 'detecting' && detectedLabel && (
                    <p className="text-white/70 text-xs mt-1">Building your listing…</p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center">
              <CameraIcon />
            </div>
            <p className="font-semibold text-gray-700">Tap to upload a photo</p>
            <p className="text-xs text-gray-400">JPG, PNG, WEBP · up to 10 MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onInputChange}
          className="hidden"
        />
      </div>

      {preview && !busy && (
        <button
          onClick={() => inputRef.current?.click()}
          className="self-center text-sm font-semibold text-brand-600 active:scale-95"
        >
          Choose a different photo
        </button>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm font-medium text-center animate-bounce-in">
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!file || busy}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <Spinner />
            {phase === 'uploading'
              ? 'Uploading…'
              : phase === 'analyzing'
              ? 'Analyzing image…'
              : phase === 'detecting'
              ? 'Detecting item…'
              : 'Building listing…'}
          </>
        ) : (
          <>
            <SparklesIcon />
            Generate Listing
          </>
        )}
      </button>

      {/* Animated step tracker */}
      {busy && (
        <div className="card flex flex-col gap-0 overflow-hidden animate-slide-up !p-0">
          {PHASES.map((p, i) => {
            const isDone = i < currentPhaseIndex
            const isActive = p.id === phase
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                  isActive ? 'bg-brand-50' : isDone ? 'bg-white' : 'bg-white'
                } ${i < PHASES.length - 1 ? 'border-b border-orange-50' : ''}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    isDone
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-brand-500 text-white'
                      : 'bg-orange-100 text-gray-300'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm font-semibold transition-colors ${
                      isActive ? 'text-brand-700' : isDone ? 'text-gray-500' : 'text-gray-300'
                    }`}
                  >
                    {p.id === 'detecting' && isActive && detectedLabel
                      ? `Detected: ${detectedLabel}`
                      : p.label}
                  </span>
                  {isActive && p.id === 'analyzing' && (
                    <p className="text-[11px] text-brand-500 mt-0.5">Reading item, colorway, condition…</p>
                  )}
                  {isActive && p.id === 'detecting' && !detectedLabel && (
                    <p className="text-[11px] text-brand-500 mt-0.5">Identifying item category…</p>
                  )}
                </div>
                {isActive && <Spinner />}
              </div>
            )
          })}
        </div>
      )}

      {/* How it works */}
      {!file && !busy && (
        <div className="card animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center">
              <SparklesIcon small />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">AI vision listing</h3>
          </div>
          <div className="flex flex-col gap-3">
            <Step n={1} text="Upload a photo of your item" />
            <Step n={2} text="AI reads the image: item type, brand, condition" />
            <Step n={3} text="Detected item type shown in real time" />
            <Step n={4} text="Edit and copy your listing to eBay, Depop, or Poshmark" />
          </div>
        </div>
      )}
    </div>
  )
}

function Step({ n, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
        {n}
      </div>
      <span className="text-sm text-gray-700 font-medium">{text}</span>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg className="w-7 h-7 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175M12 12.75m0 0l-3-3m3 3l3-3m-6 6l-3-3m3 3l3-3" />
    </svg>
  )
}

function SparklesIcon({ small } = {}) {
  return (
    <svg
      className={small ? 'w-3.5 h-3.5 text-brand-500' : 'w-5 h-5'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09l-.813 2.846z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-brand-500" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
