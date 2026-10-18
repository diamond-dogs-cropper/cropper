import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider'
import { router } from './router/router'

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
