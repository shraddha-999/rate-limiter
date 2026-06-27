import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useTheme } from '@/hooks/useTheme'

// Lazy-load pages for code splitting
const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const RequestSimulator = lazy(() => import('@/pages/RequestSimulator').then((m) => ({ default: m.RequestSimulator })))
const Configurations = lazy(() => import('@/pages/Configurations').then((m) => ({ default: m.Configurations })))
const AlgorithmVisualizer = lazy(() => import('@/pages/AlgorithmVisualizer').then((m) => ({ default: m.AlgorithmVisualizer })))
const RedisInspector = lazy(() => import('@/pages/RedisInspector').then((m) => ({ default: m.RedisInspector })))
const Metrics = lazy(() => import('@/pages/Metrics').then((m) => ({ default: m.Metrics })))
const Logs = lazy(() => import('@/pages/Logs').then((m) => ({ default: m.Logs })))
const ApiDocumentation = lazy(() => import('@/pages/ApiDocumentation').then((m) => ({ default: m.ApiDocumentation })))
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })))
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })))

function ThemeInit() {
  useTheme()
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeInit />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Dashboard routes */}
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/simulator" element={<RequestSimulator />} />
            <Route path="/configurations" element={<Configurations />} />
            <Route path="/algorithms" element={<AlgorithmVisualizer />} />
            <Route path="/redis" element={<RedisInspector />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/api-docs" element={<ApiDocumentation />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
