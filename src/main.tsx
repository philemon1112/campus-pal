import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/lib/auth'
import { AssistantProvider } from '@/lib/assistant'
import { ThemeProvider } from '@/lib/theme'

// AssistantProvider sits above the router so one conversation survives
// navigation (FR-3.7) — see src/lib/assistant.tsx.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AssistantProvider>
            <App />
          </AssistantProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
