import { useState } from 'react'
import { PLATFORMS, buildExportText, copyToClipboard, getPlatform } from '../lib/platforms.js'

export default function ExportModal({ item, selectedPlatform, onClose, onPlatformChange, onListed }) {
  const [copied, setCopied] = useState(false)
  const platform = selectedPlatform ? getPlatform(selectedPlatform) : null
  const exportText = platform ? buildExportText(item, selectedPlatform) : ''

  async function handleCopy() {
    const ok = await copyToClipboard(exportText)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleMarkListed() {
    onListed(selectedPlatform)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-orange-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Copy Listing</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Step 1: Choose Platform</p>
            <div className="flex flex-col gap-2">
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
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.hint}</p>
                  </div>
                  {selectedPlatform === p.id && (
                    <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {platform && (
            <>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Step 2: Copy This</p>
                <pre className="bg-gray-900 text-gray-100 text-xs font-mono whitespace-pre-wrap break-words p-4 rounded-2xl overflow-x-auto">
                  {exportText}
                </pre>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCopy}
                  className={`btn-primary flex items-center justify-center gap-2 ${copied ? '!bg-green-500' : ''}`}
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
                      Copy to {platform.name}
                    </>
                  )}
                </button>
                <button onClick={handleMarkListed} className="btn-secondary">
                  Mark as Listed
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                This is a mock export. In the full version, this would post directly to {platform.name}.
              </p>
            </>
          )}
        </div>
      </div>
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
