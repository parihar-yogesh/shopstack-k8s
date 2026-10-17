import { type FormEvent, type ReactNode, useState } from 'react';

const INPUT_CLASS =
  'mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900';

interface AuthFormProps {
  title: string;
  submitLabel: string;
  passwordAutoComplete: 'current-password' | 'new-password';
  passwordHint?: string;
  error: string | null;
  pending: boolean;
  onSubmit: (email: string, password: string) => void;
  footer: ReactNode;
}

export function AuthForm({
  title,
  submitLabel,
  passwordAutoComplete,
  passwordHint,
  error,
  pending,
  onSubmit,
  footer,
}: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(email, password);
  }

  return (
    <section className="mx-auto max-w-sm py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={10}
            autoComplete={passwordAutoComplete}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={INPUT_CLASS}
          />
          {passwordHint && <p className="mt-2 text-xs text-stone-500">{passwordHint}</p>}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {pending ? 'Please wait...' : submitLabel}
        </button>
      </form>

      <p className="mt-6 text-sm text-stone-600">{footer}</p>
    </section>
  );
}