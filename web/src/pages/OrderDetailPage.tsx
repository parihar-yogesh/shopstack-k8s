import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError, getOrder } from '../lib/api';
import { formatPrice } from '../lib/money';
import { formatOrderDate, formatOrderNumber } from '../lib/orderFormat';

export function OrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced === true;

  const { data, isPending, error } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => getOrder(id as string),
    enabled: id !== undefined,
  });

  if (error) {
    const missing = error instanceof ApiError && error.status === 404;

    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {missing ? 'Order not found' : 'Something went wrong'}
        </h1>
        <Link
          to="/orders"
          className="mt-6 inline-block rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Back to your orders
        </Link>
      </section>
    );
  }

  if (isPending) {
    return <p className="py-16 text-center text-stone-500">Loading order...</p>;
  }

  return (
    <article className="mx-auto max-w-2xl">
      {justPlaced && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Thank you. Your order has been placed.
        </p>
      )}

      <Link
        to="/orders"
        className="mt-6 inline-block text-sm text-stone-500 underline-offset-4 hover:underline"
      >
        Back to your orders
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Order {formatOrderNumber(data.id)}
      </h1>
      <div className="mt-3 flex items-center gap-3 text-sm text-stone-500">
        <span>{formatOrderDate(data.createdAt)}</span>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs capitalize text-stone-600">
          {data.status}
        </span>
      </div>

      <ul className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
        {data.items.map((item) => (
          <li key={item.productId} className="flex items-baseline gap-4 py-4">
            <div className="grow">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="mt-1 text-xs uppercase text-stone-500">{item.sku}</p>
            </div>
            <p className="text-sm text-stone-500 tabular-nums">
              {item.quantity} &times; {formatPrice(item.unitPriceCents, data.currency)}
            </p>
            <p className="w-24 shrink-0 text-right text-sm tabular-nums">
              {formatPrice(item.lineTotalCents, data.currency)}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-right text-sm text-stone-600">
        Total{' '}
        <span className="ml-3 text-lg tabular-nums text-stone-900">
          {formatPrice(data.totalCents, data.currency)}
        </span>
      </p>

      <p className="mt-8 text-xs text-stone-500">
        Prices are stored on the order at the moment it is placed, so later catalogue changes do not
        alter what you were charged.
      </p>
    </article>
  );
}