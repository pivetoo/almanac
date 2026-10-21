import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppLayout, AuthService, useAuth, useI18n, useNotifications } from 'archon-ui'
import type { BreadcrumbItem, ModuleNavConfig } from 'archon-ui'
import { BookMarked, BookOpen, ClipboardCheck, FolderTree, Home, Search } from 'lucide-react'
import logoEmpresa from '../assets/logo-empresa.png'
import { CatalogProvider } from '../lib/catalog'

export default function AlmanacLayout() {
  const { t } = useI18n()
  const { user: authUser, contract } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications({ enabled: false })

  const handleLogout = async () => {
    try {
      await AuthService.logoutFromServer()
    } finally {
      window.location.href = new URL('/logout', import.meta.env.VITE_IDENTITY_MANAGEMENT_URL).toString()
    }
  }

  const moduleNav: ModuleNavConfig = [
    {
      key: 'explorar',
      label: t('web.nav.explore'),
      icon: <BookOpen size={20} />,
      group: 'op',
      routes: [
        { key: 'inicio', label: t('web.nav.home'), path: '/', icon: <Home size={20} /> },
        { key: 'buscar', label: t('web.nav.search'), path: '/buscar', icon: <Search size={20} /> }
      ]
    },
    {
      key: 'gestao',
      label: t('web.nav.manage'),
      icon: <ClipboardCheck size={20} />,
      group: 'op',
      routes: [
        { key: 'revisao', label: t('web.nav.review'), path: '/revisao', icon: <ClipboardCheck size={20} /> },
        { key: 'catalogo', label: t('web.nav.catalog'), path: '/catalogo', icon: <FolderTree size={20} /> },
        { key: 'guia', label: t('web.nav.guide'), path: '/guia', icon: <BookMarked size={20} /> }
      ]
    }
  ]

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const crumbs: BreadcrumbItem[] = [{ label: t('web.nav.home'), onClick: () => navigate('/') }]
    const labels: Record<string, string> = {
      '/buscar': t('web.nav.search'),
      '/revisao': t('web.nav.review'),
      '/catalogo': t('web.nav.catalog'),
      '/guia': t('web.nav.guide'),
      '/docs/novo': t('web.editor.newTitle')
    }

    const label = labels[location.pathname]

    if (label) {
      crumbs.push({ label })
    } else if (location.pathname.startsWith('/docs/')) {
      crumbs.push({ label: t('web.nav.document') })
    } else if (location.pathname.startsWith('/produtos/')) {
      crumbs.push({ label: t('web.nav.products') })
    }

    return crumbs
  }, [location.pathname, navigate, t])

  return (
    <CatalogProvider>
      <AppLayout
        title="Almanac"
        subtitle="by Mainstay"
        navbarCompanyName={contract?.companyName}
        user={{ name: authUser?.name ?? '', email: authUser?.email ?? '', role: contract?.roleName }}
        onLogout={handleLogout}
        logo={
          <span className="flex items-center justify-center rounded-md bg-white p-0.5">
            <img src={logoEmpresa} alt="Mainstay" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </span>
        }
        navMode="module-rail"
        moduleNav={moduleNav}
        breadcrumbs={breadcrumbs}
        notifications={notifications}
        onNotificationRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearAllNotifications={clearAll}
      >
        <Outlet />
      </AppLayout>
    </CatalogProvider>
  )
}
