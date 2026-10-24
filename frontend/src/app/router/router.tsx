import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { RootLayout } from '../layouts/RootLayout'
import { RouteErrorPage } from '../../pages/route-error/ui/RouteErrorPage'
import { GuestOnly } from './guards/GuestOnly'
import { RequireAuth } from './guards/RequireAuth'
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
        element: <GuestOnly />,
        children: [
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
        ],
      },
      {
        path: routePaths.publicTemplate,
        lazy: () => import('../../pages/public-template/ui/PublicTemplatePage'),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                path: routePaths.templates,
                lazy: () => import('../../pages/templates/ui/TemplatesPage'),
              },
              {
                path: routePaths.templateNew,
                lazy: () => import('../../pages/template-new/ui/TemplateNewPage'),
              },
              {
                path: routePaths.template,
                lazy: () => import('../../pages/template/ui/TemplatePage'),
              },
            ],
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
