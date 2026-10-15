import { useQuery } from '@tanstack/react-query';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import { listProducts } from '../lib/api';

export function HomePage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: listProducts,
  });

  return (
    <section>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Everyday things, chosen carefully
        </h1>
        <p className="mt-3 text-stone-600">
          A small catalogue of homeware and electronics, picked for how they wear in over time.
        </p>
      </header>

      {isError ? (
        <div className="mt-10 rounded-lg border border-stone-200 bg-white p-8 text-center">
          <p className="text-stone-700">The catalogue could not be loaded.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {isPending
            ? Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)
            : data.items.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </section>
  );
}