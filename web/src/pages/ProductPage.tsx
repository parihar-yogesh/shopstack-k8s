import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ApiError, getProduct } from '../lib/api';
import { formatPrice } from '../lib/money';

function stockLabel(stock: number): string {
  if (stock === 0) return 'Sold out';
  if (stock <= 5) return `Only ${stock} left`;
  return 'In stock';
}

export function ProductPage() {
  const { id } = useParams();

  const { data, isPending, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id as string),
    enabled: id !== undefined,
  });

  if (error) {
    const missing = error instanceof ApiError && error.status === 404;

    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {missing ? 'Product not found' : 'Something went wrong'}
        </h1>
        <p className="mt-3 text-stone-600">
          {missing ? 'That product is no longer in the catalogue.' : 'Please try again shortly.'}
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Back to the catalogue
        </Link>
      </section>
    );
  }

  return (
    <article>
      <Link to="/" className="text-sm text-stone-500 underline-offset-4 hover:underline">
        Back to the catalogue
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
          {!isPending && (
            <img src={data.imageUrl} alt={data.name} className="h-full w-full object-cover" />
          )}
        </div>

        {isPending ? (
          <div className="animate-pulse space-y-4 lg:pt-4">
            <div className="h-8 w-3/4 rounded bg-stone-200" />
            <div className="h-6 w-24 rounded bg-stone-200" />
            <div className="h-4 w-full rounded bg-stone-200" />
            <div className="h-4 w-5/6 rounded bg-stone-200" />
          </div>
        ) : (
          <div className="lg:pt-4">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{data.name}</h1>

            <p className="mt-3 text-xl tabular-nums text-stone-900">
              {formatPrice(data.priceCents, data.currency)}
            </p>

            <p className="mt-6 leading-relaxed text-stone-600">{data.description}</p>

            <dl className="mt-8 space-y-2 border-t border-stone-200 pt-6 text-sm">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-stone-500">Availability</dt>
                <dd className={data.stock === 0 ? 'text-stone-500' : 'text-stone-900'}>
                  {stockLabel(data.stock)}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-stone-500">Item code</dt>
                <dd className="text-stone-900 uppercase">{data.sku}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </article>
  );
}