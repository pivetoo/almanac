import { useEffect } from 'react'
import { AuthProvider, ThemeProvider, GlobalLoaderProvider, I18nProvider, useGlobalLoader, setGlobalLoaderContext, Toaster, setApiBaseURL, setIdentityManagementURL } from 'archon-ui'
import AppRoutes from './routes'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const identityManagementUrl = import.meta.env.VITE_IDENTITY_MANAGEMENT_URL

if (apiBaseUrl) {
  setApiBaseURL(apiBaseUrl)
}

if (identityManagementUrl) {
  setIdentityManagementURL(identityManagementUrl)
}

function AppContent() {
  const globalLoaderContext = useGlobalLoader()

  useEffect(() => {
    setGlobalLoaderContext(globalLoaderContext)
  }, [globalLoaderContext])

  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <GlobalLoaderProvider>
        <I18nProvider>
          <AppContent />
        </I18nProvider>
      </GlobalLoaderProvider>
    </ThemeProvider>
  )
}

export default App
