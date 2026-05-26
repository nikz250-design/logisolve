import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.jsx'
import './styles/glass.css'

// margin/padding and background handled in index.html to avoid white flash

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
