import { useState } from 'react'
import { PLATFORMS, getPlatform } from '../lib/platforms.js'
import { buildExportText, copyToClipboard } from '../lib/platforms.js'

export default function ExportModal({ item, selectedPlatform, onClose, onPlatformChange, onListed }) {
  const [copied, setCopied] = useState(false)
  const platform = selectedPlatform ? getPlatform(selectedPlatform) : null
  const exportText = platform ? buildExportText(item, selectedPlatform) : ''

  async function handleCopy() {
    const ok = await copyToClipboard(exportText)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  function handleMarkListed() {
    onListed(selectedPlatform)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[88vh] overflow-y-auto animate-slide-up">

        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 pt-4 pb-3 border-b border-orange-50 flex items-center justify-between z-10">
          <h3 className="font-bold text-gray-900">Copy to Platform</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition-transform">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5">

          {/* Step 1: platform select */}
          <div>
            <SectionLabel step={1} text="Choose a platform" />
            <div className="flex flex-col gap-2 mt-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPlatformChange(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                    selectedPlatform === p.id
                      ? `${p.bgColor} ${p.borderColor}`
                      : 'border-orange-100 bg-white hover:border-orange-200'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: p.color }}>
                    {p.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.hint}</p>
                  </div>
                  {selectedPlatform === p.id && (
                    <svg className="w-5 h-5 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {platform && (
            <>
              {/* Review warning inside modal */}
              {item.requiresReview && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    AI confidence is <strong>{item.confidence}</strong>. Make sure you have edited the listing to be accurate before copying.
                  </p>
                </div>
              )}

              {/* Step 2: preview */}
              <div>
                <SectionLabel step={2} text="Review what will be copied" />
                <pre className="mt-2 bg-gray-950 text-gray-100 text-xs font-mono whitespace-pre-wrap break-words p-4 rounded-2xl leading-relaxed">
                  {exportText}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCopy}
                  className={`btn-primary flex items-center justify-center gap-2 transition-colors ${copied ? '!bg-green-500' : ''}`}
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      Copy listing for {platform.name}
                    </>
                  )}
                </button>
                <button onClick={handleMarkListed} className="btn-secondary">
                  Mark as Listed on {platform.name}
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center pb-1">
                Mock export only — no real API connection to {platform.name}.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ step, text }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
        {step}
      </div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{text}</p>
    </div>
  )
}

function CopyIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 3.625V4.875c0-.621-.504-1.125-1.125-1.125H16.5" />
    </svg>
  )
}
