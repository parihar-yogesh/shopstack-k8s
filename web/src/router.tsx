import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/Layout';
import { CartPage } from './pages/CartPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductPage } from './pages/ProductPage';
import { RegisterPage } from './pages/RegisterPage';
import { SignInPage } from './pages/SignInPage';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/products/:id', element: <ProductPage /> },
      { path: '/cart', element: <CartPage /> },
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        path: '/orders',
        element: (
          <RequireAuth>
            <OrdersPage />
          </RequireAuth>
        ),
      },
      {
        path: '/orders/:id',
        element: (
          <RequireAuth>
            <OrderDetailPage />
          </RequireAuth>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);