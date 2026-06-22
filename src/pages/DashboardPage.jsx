import { useEffect, useState, useCallback } from 'react'
import { fetchItems, updateItem, deleteItem } from '../services/items.js'
import ExportModal from '../components/ExportModal.jsx'
import { getPlatform } from '../lib/platforms.js'

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'not_listed', label: 'Not Listed' },
  { id: 'listed', label: 'Listed' },
  { id: 'sold', label: 'Sold' },
]

const STATUS_META = {
  not_listed: { label: 'Not Listed', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  listed: { label: 'Listed', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
  sold: { label: 'Sold', color: 'bg-green-50 text-green-600', dot: 'bg-green-500' },
}

export default function DashboardPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [exportItem, setExportItem] = useState(null)
  const [stats, setStats] = useState({ total: 0, listed: 0, sold: 0, revenue: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchItems()
      setItems(data)
      const soldItems = data.filter((i) => i.status === 'sold')
      setStats({
        total: data.length,
        listed: data.filter((i) => i.status === 'listed').length,
        sold: soldItems.length,
        revenue: soldItems.reduce((sum, i) => sum + Number(i.price || 0), 0),
      })
    } catch (err) {
      console.error(err)
      setError('Could not load items. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleStatusChange(id, status) {
    try {
      await updateItem(id, { status })
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)))
      load()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this item?')) return
    try {
      await deleteItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      load()
    } catch (err) {
      console.error(err)
    }
  }

  async function handlePlatformListed(item, platform) {
    try {
      const updated = await updateItem(item.id, { platform, status: 'listed' })
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
      load()
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter)

  return (
    <div className="px-5 py-6 flex flex-col gap-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Items</h2>
        <p className="text-gray-500 text-sm mt-0.5">Track your flips and sales</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Listed" value={stats.listed} />
        <StatCard label="Sold" value={stats.sold} accent="green" />
      </div>

      {stats.sold > 0 && (
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 !border-green-200">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center">
              <DollarIcon />
            </div>
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.revenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
              filter === f.id
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                : 'bg-white text-gray-500 border border-orange-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Items list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex gap-3">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-6 bg-gray-100 rounded-full w-20 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card text-center py-8">
          <p className="text-red-500 text-sm font-medium mb-3">{error}</p>
          <button onClick={load} className="btn-secondary !py-2.5 text-sm">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onExport={() => setExportItem(item)}
            />
          ))}
        </div>
      )}

      {exportItem && (
        <ExportModal
          item={{
            title: exportItem.title,
            description: exportItem.description,
            price: exportItem.price,
            condition: exportItem.condition,
            category: exportItem.category,
            confidence: exportItem.confidence_level || exportItem.ai_confidence || 'low',
            notes: exportItem.notes || [],
            priceRange: exportItem.price_range_low != null ? { low: exportItem.price_range_low, high: exportItem.price_range_high } : null,
            requiresReview: exportItem.requires_review ?? false,
          }}
          selectedPlatform={exportItem.platform}
          onClose={() => setExportItem(null)}
          onPlatformChange={(platform) => setExportItem((prev) => ({ ...prev, platform }))}
          onListed={(platform) => handlePlatformListed(exportItem, platform)}
        />
      )}
    </div>
  )
}

const CONF_BADGE = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-red-100 text-red-600',
}

function ItemCard({ item, onStatusChange, onDelete, onExport }) {
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_META[item.status] || STATUS_META.not_listed
  const platform = item.platform ? getPlatform(item.platform) : null
  const conf = item.confidence_level || item.ai_confidence

  return (
    <div className="card !p-3 animate-slide-up">
      {item.requires_review && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2">
          <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>
          <p className="text-[11px] font-semibold text-amber-800">Review before posting — AI confidence is {conf || 'low'}</p>
        </div>
      )}
      <div className="flex gap-3">
        <img src={item.image_url} alt={item.title} className="w-20 h-20 rounded-2xl object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{item.title}</h3>
            <button onClick={onDelete} className="text-gray-300 hover:text-red-500 shrink-0 active:scale-90">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.523 48.523 0 00-7.5 0" />
              </svg>
            </button>
          </div>
          <p className="text-lg font-bold text-brand-600 mt-0.5">${Number(item.price).toFixed(2)}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${status.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {platform && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: platform.color }}>
                {platform.name}
              </span>
            )}
            {conf && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${CONF_BADGE[conf] || 'bg-gray-100 text-gray-500'}`}>
                {conf} AI
              </span>
            )}
          </div>
        </div>
      </div>

      <button onClick={() => setExpanded((e) => !e)} className="text-xs font-semibold text-brand-600 mt-2 active:scale-95">
        {expanded ? 'Hide details' : 'View details'}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-orange-50 flex flex-col gap-2 animate-fade-in">
          <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
          <div className="flex gap-2 flex-wrap text-[10px] text-gray-400">
            <span>{item.condition}</span>
            {item.category && <><span>•</span><span>{item.category}</span></>}
            {item.price_range_low != null && (
              <><span>•</span><span>Range: ${item.price_range_low}–${item.price_range_high}</span></>
            )}
          </div>
          {item.notes?.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">To verify</p>
              <ul className="flex flex-col gap-1">
                {item.notes.map((note, i) => (
                  <li key={i} className="text-[11px] text-amber-800 flex items-start gap-1.5">
                    <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {item.status === 'not_listed' && (
          <button onClick={onExport} className="btn-primary flex-1 !py-2.5 text-xs">
            List Now
          </button>
        )}
        {item.status === 'listed' && (
          <button onClick={() => onStatusChange(item.id, 'sold')} className="btn-primary flex-1 !py-2.5 text-xs !bg-green-500 hover:!bg-green-600">
            Mark Sold
          </button>
        )}
        {item.status === 'sold' && (
          <button onClick={() => onStatusChange(item.id, 'listed')} className="btn-secondary flex-1 !py-2.5 text-xs">
            Unmark Sold
          </button>
        )}
        {item.platform && (
          <button onClick={onExport} className="btn-secondary !py-2.5 text-xs !px-3">
            <CopyIcon />
          </button>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`card !p-3 text-center ${accent === 'green' ? '!bg-green-50 !border-green-100' : ''}`}>
      <p className={`text-2xl font-bold ${accent === 'green' ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function EmptyState({ filter }) {
  return (
    <div className="card flex flex-col items-center text-center py-10">
      <div className="w-16 h-16 bg-orange-100 rounded-3xl flex items-center justify-center mb-3">
        <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      {filter === 'all' ? (
        <>
          <h3 className="font-bold text-gray-900">No items yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">Upload your first item to start flipping.</p>
          <a href="/" className="btn-primary !py-2.5 text-sm">+ Add Item</a>
        </>
      ) : (
        <p className="text-sm text-gray-500">No {filter.replace('_', ' ')} items here.</p>
      )}
    </div>
  )
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 3.625V4.875c0-.621-.504-1.125-1.125-1.125H16.5" />
    </svg>
  )
}

function DollarIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
