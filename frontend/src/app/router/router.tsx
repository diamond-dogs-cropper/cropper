import { createBrowserRouter } from 'react-router-dom'
import { AuthLayout } from '../layouts/AuthLayout'
import { RootLayout } from '../layouts/RootLayout'
import { RouteErrorPage } from '../../pages/route-error/ui/RouteErrorPage'
import { routePaths } from './routePaths'

export const router = createBrowserRouter([
  {
    path: routePaths.home,
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        lazy: () => import('../../pages/home/ui/HomePage'),
      },
      {
        element: <AuthLayout />,
        children: [
          {
            path: routePaths.login,
            lazy: () => import('../../pages/login/ui/LoginPage'),
          },
          {
            path: routePaths.register,
            lazy: () => import('../../pages/register/ui/RegisterPage'),
          },
        ],
      },
      {
        path: '*',
        lazy: () => import('../../pages/not-found/ui/NotFoundPage'),
      },
    ],
  },
])
