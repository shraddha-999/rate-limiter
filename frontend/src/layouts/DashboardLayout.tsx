import { Outlet, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import { Toaster } from 'react-hot-toast'

export function DashboardLayout() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Suspense fallback={<PageLoader />}>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </Suspense>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            fontSize: '13px',
          },
          success: {
            iconTheme: { primary: 'hsl(var(--success))', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: 'hsl(var(--destructive))', secondary: 'white' },
          },
        }}
      />
    </div>
  )
}
