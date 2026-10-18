import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listOrders } from '../lib/api';
import { formatPrice } from '../lib/money';
import { formatOrderDate, formatOrderNumber } from '../lib/orderFormat';

export function OrdersPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: listOrders,
  });

  if (isPending) {
    return <p className="py-16 text-center text-stone-500">Loading your orders...</p>;
  }

  if (isError) {
    return <p className="py-16 text-center text-stone-600">Your orders could not be loaded.</p>;
  }

  if (data.items.length === 0) {
    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">No orders yet</h1>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Browse the catalogue
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your orders</h1>

      <ul className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
        {data.items.map((order) => (
          <li key={order.id}>
            <Link to={`/orders/${order.id}`} className="flex items-center gap-4 py-5 group">
              <div className="grow">
                <p className="text-sm font-medium underline-offset-4 group-hover:underline">
                  Order {formatOrderNumber(order.id)}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {formatOrderDate(order.createdAt)} &middot;{' '}
                  {order.items.length === 1 ? '1 item' : `${order.items.length} items`}
                </p>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs capitalize text-stone-600">
                {order.status}
              </span>
              <p className="w-24 shrink-0 text-right text-sm tabular-nums">
                {formatPrice(order.totalCents, order.currency)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}