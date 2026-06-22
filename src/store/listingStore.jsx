import { createContext, useContext, useState, useCallback } from 'react'

const ListingStoreContext = createContext(null)

export function ListingStoreProvider({ children }) {
  const [pendingListing, setPendingListing] = useState(null)
  const [draftId, setDraftId] = useState(null)

  const setListing = useCallback((data) => {
    setPendingListing(data)
    if (data?.id) setDraftId(data.id)
  }, [])

  const clear = useCallback(() => {
    setPendingListing(null)
    setDraftId(null)
  }, [])

  return (
    <ListingStoreContext.Provider value={{ pendingListing, draftId, setListing, clear }}>
      {children}
    </ListingStoreContext.Provider>
  )
}

export function useListingStore() {
  const ctx = useContext(ListingStoreContext)
  if (!ctx) throw new Error('useListingStore must be used within ListingStoreProvider')
  return ctx
}
