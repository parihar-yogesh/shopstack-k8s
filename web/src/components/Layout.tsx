import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 antialiased">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            ShopStack
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl grow px-6 py-12">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-stone-500">
          A demo store. No real orders are fulfilled.
        </div>
      </footer>
    </div>
  );
}