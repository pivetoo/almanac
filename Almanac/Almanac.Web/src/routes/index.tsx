import { useMemo } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Callback, ProtectedRoute, useAuth } from 'archon-ui'
import AlmanacLayout from '../layouts/AlmanacLayout'
import Home from '../modules/Home'
import Search from '../modules/Search'
import ProductPage from '../modules/Product'
import ModulePage from '../modules/Module'
import Review from '../modules/Review'
import Catalog from '../modules/Catalog'
import Guide from '../modules/Guide'
import NotFound from '../modules/NotFound'

const identityManagementUrl = import.meta.env.VITE_IDENTITY_MANAGEMENT_URL
const oidcClientId = import.meta.env.VITE_OIDC_CLIENT_ID || 'almanac-web'

// Leitor e editor carregam o renderizador de Markdown, a parte mais pesada: só baixam quando a tela é aberta.
const loadView = async () => ({ Component: (await import('../modules/Document/View')).default })
const loadEditor = async () => ({ Component: (await import('../modules/Document/Editor')).default })

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  // Roteador de dados: o useBlocker do editor (aviso de alteração não salva) não funciona com BrowserRouter.
  const router = useMemo(
    () =>
      createBrowserRouter([
        { path: '/callback', element: <Callback identityManagementUrl={identityManagementUrl} oidcClientId={oidcClientId} redirectTo="/" /> },
        {
          element: (
            <ProtectedRoute isAuthenticated={isAuthenticated} redirectTo={identityManagementUrl} externalRedirect={true} callbackPath="/callback" oidcClientId={oidcClientId}>
              <AlmanacLayout />
            </ProtectedRoute>
          ),
          children: [
            { index: true, element: <Home /> },
            { path: 'buscar', element: <Search /> },
            { path: 'produtos/:product', element: <ProductPage /> },
            { path: 'produtos/:product/:module', element: <ModulePage /> },
            { path: 'docs/novo', lazy: loadEditor },
            { path: 'docs/:id', lazy: loadView },
            { path: 'docs/:id/editar', lazy: loadEditor },
            { path: 'revisao', element: <Review /> },
            { path: 'catalogo', element: <Catalog /> },
            { path: 'guia', element: <Guide /> },
            { path: '*', element: <NotFound /> }
          ]
        }
      ]),
    [isAuthenticated]
  )

  return <RouterProvider router={router} />
}

export default AppRoutes
