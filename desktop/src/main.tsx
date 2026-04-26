import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// TESTING
import { ConversationProvider } from '@elevenlabs/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConversationProvider>
      {/* put app inside conversation provided  */}
      <App /> 
    </ConversationProvider>
  </React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
