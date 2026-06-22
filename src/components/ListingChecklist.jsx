export default function ListingChecklist({ item }) {
  const steps = [
    { key: 'photo', label: 'Photo uploaded', done: !!item?.imageUrl },
    {
      key: 'title',
      label: 'Title ready',
      done: !!item?.title,
    },
    {
      key: 'description',
      label: 'Description ready',
      done: !!item?.description,
    },
    {
      key: 'price',
      label: 'Price set',
      done: Number(item?.price) > 0,
    },
    {
      key: 'platform',
      label: 'Platform chosen',
      done: !!item?.platform,
    },
    {
      key: 'listed',
      label: `Listed on ${item?.platform ? platformName(item.platform) : 'platform'}`,
      done: item?.status === 'listed' || item?.status === 'sold',
    },
  ]

  const completed = steps.filter((s) => s.done).length

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Listing Checklist</h3>
        <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
          {completed}/{steps.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {steps.map((step) => (
          <CheckRow key={step.key} label={step.label} done={step.done} />
        ))}
      </div>
      <div className="mt-4">
        <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-500"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function platformName(id) {
  const map = { ebay: 'eBay', depop: 'Depop', poshmark: 'Poshmark' }
  return map[id] || id
}

function CheckRow({ label, done }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
          done ? 'bg-green-500 text-white scale-100' : 'bg-orange-100 text-orange-300 scale-90'
        }`}
      >
        {done ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="text-[10px] font-bold">•</span>
        )}
      </div>
      <span className={`text-sm font-medium ${done ? 'text-gray-700 line-through decoration-gray-300' : 'text-gray-600'}`}>
        {label}
      </span>
    </div>
  )
}
