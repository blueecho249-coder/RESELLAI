import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ListingStoreProvider } from './store/listingStore.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ListingStoreProvider>
        <App />
      </ListingStoreProvider>
    </BrowserRouter>
  </React.StrictMode>
)
