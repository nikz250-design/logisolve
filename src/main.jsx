import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.jsx'

document.body.style.margin = '0'
document.body.style.padding = '0'
document.body.style.background = '#070909'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
