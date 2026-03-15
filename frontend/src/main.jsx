import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1C2230',
            color: '#E8EDF5',
            border: '1px solid #2A3347',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#1D9E75', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF5350', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)