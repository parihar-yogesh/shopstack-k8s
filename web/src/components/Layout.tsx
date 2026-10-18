import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { CURRENT_USER_KEY, useCurrentUser } from '../auth/useCurrentUser';
import { useCart } from '../cart/useCart';
import { logout } from '../lib/api';

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'text-stone-900' : 'text-stone-600 hover:text-stone-900';
}

function AccountNav() {
  const { data: user, isPending } = useCurrentUser();
  const queryClient = useQueryClient();

  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(CURRENT_USER_KEY, null);
      // Order history belongs to the account that just left.
      void queryClient.removeQueries({ queryKey: ['orders'] });
    },
  });

  if (isPending) {
    return null;
  }

  if (!user) {
    return (
      <NavLink to="/sign-in" className={navClass}>
        Sign in
      </NavLink>
    );
  }

  return (
    <>
      <span className="hidden text-stone-400 lg:inline">{user.email}</span>
      <NavLink to="/orders" className={navClass}>
        Orders
      </NavLink>
      <button
        type="button"
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
        className="text-stone-600 hover:text-stone-900 disabled:opacity-50"
      >
        Sign out
      </button>
    </>
  );
}

function CartLink() {
  const { items } = useCart();
  const count = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <NavLink to="/cart" className={navClass}>
      Cart{count > 0 && <span className="ml-1 tabular-nums">({count})</span>}
    </NavLink>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 antialiased">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            ShopStack
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <AccountNav />
            <CartLink />
          </nav>
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