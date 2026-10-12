import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-stone-600">That page does not exist.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
      >
        Back to the catalogue
      </Link>
    </section>
  );
}