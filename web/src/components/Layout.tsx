import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet } from 'react-router-dom';
import { CURRENT_USER_KEY, useCurrentUser } from '../auth/useCurrentUser';
import { logout } from '../lib/api';

function AccountNav() {
  const { data: user, isPending } = useCurrentUser();
  const queryClient = useQueryClient();

  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData(CURRENT_USER_KEY, null),
  });

  if (isPending) {
    return null;
  }

  if (!user) {
    return (
      <Link to="/sign-in" className="text-sm text-stone-600 hover:text-stone-900">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="hidden text-stone-500 sm:inline">{user.email}</span>
      <button
        type="button"
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
        className="text-stone-600 hover:text-stone-900 disabled:opacity-50"
      >
        Sign out
      </button>
    </div>
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
          <AccountNav />
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