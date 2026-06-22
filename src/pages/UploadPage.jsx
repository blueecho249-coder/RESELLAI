import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadImage } from '../services/items.js'
import { useListingStore } from '../store/listingStore.jsx'
import { generateListing } from '../lib/aiGenerator.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function analyzeWithVision(imageUrl) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ imageUrl }),
  })

  // 503 means no API key is configured — not a hard failure, use fallback
  if (res.status === 503) return null

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Vision API error (${res.status})`)
  }

  const data = await res.json()
  // Sanity-check the shape before trusting it
  if (!data.title || !data.description || !data.confidence) {
    throw new Error('Unexpected response shape from vision API')
  }
  return data
}

export default function UploadPage() {
  const navigate = useNavigate()
  const { setListing } = useListingStore()
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | uploading | analyzing | done
  const [usingVision, setUsingVision] = useState(null) // true | false | null
  const [error, setError] = useState(null)

  function handleFile(selected) {
    if (!selected) return
    if (!selected.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    setError(null)
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  function onInputChange(e) { handleFile(e.target.files?.[0]) }
  function onDrop(e) { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }

  async function handleGenerate() {
    if (!file) { setError('Add a photo first.'); return }
    setStatus('uploading')
    setError(null)
    setUsingVision(null)

    try {
      const { publicUrl, path } = await uploadImage(file)
      setStatus('analyzing')

      let ai = null
      try {
        ai = await analyzeWithVision(publicUrl)
        setUsingVision(ai !== null)
      } catch (visionErr) {
        // Vision call failed hard — fall back silently, don't surface to user
        console.warn('Vision API failed, falling back to local generator:', visionErr.message)
        setUsingVision(false)
      }

      // Fall back to the local keyword-based generator if vision is unavailable
      if (!ai) {
        ai = generateListing(file.name)
        ai.source = 'fallback'
      }

      setListing({ imageUrl: publicUrl, imageFilename: path, ...ai })
      setStatus('done')
      navigate('/results')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Try again.')
      setStatus('idle')
    }
  }

  const busy = status === 'uploading' || status === 'analyzing'

  return (
    <div className="px-5 py-6 flex flex-col gap-6 animate-fade-in">
      <section className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Got something to flip?</h2>
        <p className="text-gray-500 text-sm mt-1">Snap a pic — AI will build your listing from the image.</p>
      </section>

      {/* Drop zone */}
      <div
        onClick={() => !busy && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`relative rounded-3xl border-2 border-dashed transition-all overflow-hidden aspect-[4/3] flex items-center justify-center ${
          busy ? 'cursor-default' : 'cursor-pointer'
        } ${
          preview ? 'border-brand-400 bg-white' : 'border-orange-300 bg-orange-50 hover:border-brand-400'
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Item preview" className={`w-full h-full object-cover transition-opacity ${busy ? 'opacity-60' : 'opacity-100'}`} />
            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm gap-3">
                <Spinner large />
                <p className="text-white font-semibold text-sm drop-shadow">
                  {status === 'uploading' ? 'Uploading photo…' : 'Analyzing image with AI…'}
                </p>
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
        <button onClick={() => inputRef.current?.click()} className="self-center text-sm font-semibold text-brand-600 active:scale-95">
          Choose a different photo
        </button>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm font-medium text-center animate-bounce-in">
          {error}
        </div>
      )}

      <button onClick={handleGenerate} disabled={!file || busy} className="btn-primary w-full flex items-center justify-center gap-2">
        {busy ? <><Spinner />{status === 'uploading' ? 'Uploading…' : 'Analyzing image…'}</> : <><SparklesIcon />Generate Listing</>}
      </button>

      {/* Progress steps shown while working */}
      {busy && (
        <div className="card flex flex-col gap-3 animate-slide-up">
          <ProgressStep n={1} label="Upload photo to storage" done={status === 'analyzing' || status === 'done'} active={status === 'uploading'} />
          <ProgressStep n={2} label="Analyze image with AI vision" done={status === 'done'} active={status === 'analyzing'} />
          <ProgressStep n={3} label="Build your listing" done={false} active={false} muted />
        </div>
      )}

      {/* How it works card — only when idle */}
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
            <Step n={2} text="AI reads the image: brand, colorway, condition" />
            <Step n={3} text="Edit the title, description, and price" />
            <Step n={4} text="Copy to eBay, Depop, or Poshmark" />
          </div>
        </div>
      )}
    </div>
  )
}

function ProgressStep({ n, label, done, active, muted }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        done ? 'bg-green-500 text-white' : active ? 'bg-brand-500 text-white' : 'bg-orange-100 text-gray-400'
      }`}>
        {done ? '✓' : n}
      </div>
      <span className={`text-sm font-medium flex-1 ${muted && !active ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
      {active && <Spinner />}
    </div>
  )
}

function Step({ n, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">{n}</div>
      <span className="text-sm text-gray-700 font-medium">{text}</span>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg className="w-7 h-7 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.174 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  )
}

function SparklesIcon({ small } = {}) {
  return (
    <svg className={small ? 'w-3.5 h-3.5 text-brand-500' : 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  )
}

function Spinner({ large } = {}) {
  return (
    <svg className={`animate-spin ${large ? 'w-8 h-8 text-white' : 'w-4 h-4'}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
