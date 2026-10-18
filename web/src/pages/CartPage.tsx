import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../auth/useCurrentUser';
import { MAX_QUANTITY } from '../cart/cartStore';
import { useCart } from '../cart/useCart';
import { ApiError, listProducts, placeOrder, type Product } from '../lib/api';
import { formatPrice } from '../lib/money';

function QuantityControl({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  const buttonClass =
    'h-8 w-8 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-40';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={quantity <= 1}
        onClick={() => onChange(quantity - 1)}
        className={buttonClass}
      >
        -
      </button>
      <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={quantity >= MAX_QUANTITY}
        onClick={() => onChange(quantity + 1)}
        className={buttonClass}
      >
        +
      </button>
    </div>
  );
}

export function CartPage() {
  const { items, dispatch } = useCart();
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isPending, isError } = useQuery({
    queryKey: ['products'],
    queryFn: listProducts,
    enabled: items.length > 0,
  });

  const order = useMutation({
    mutationFn: () => placeOrder(items.map(({ productId, quantity }) => ({ productId, quantity }))),
    onSuccess: (placed) => {
      dispatch({ type: 'clear' });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void navigate(`/orders/${placed.id}`, { state: { justPlaced: true } });
    },
  });

  if (items.length === 0) {
    return (
      <section className="py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart is empty</h1>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Browse the catalogue
        </Link>
      </section>
    );
  }

  if (isPending) {
    return <p className="py-16 text-center text-stone-500">Loading your cart...</p>;
  }

  if (isError) {
    return <p className="py-16 text-center text-stone-600">Your cart could not be loaded.</p>;
  }

  const byId = new Map<string, Product>(data.items.map((product) => [product.id, product]));
  const lines = items.flatMap((item) => {
    const product = byId.get(item.productId);
    return product ? [{ product, quantity: item.quantity }] : [];
  });
  const missing = items.length - lines.length;

  const subtotal = lines.reduce(
    (total, { product, quantity }) => total + product.priceCents * quantity,
    0,
  );
  const currency = lines[0]?.product.currency ?? 'EUR';

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your cart</h1>

      {missing > 0 && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {missing === 1 ? 'One item is' : `${missing} items are`} no longer in the catalogue and
          will not be ordered.
        </p>
      )}

      <ul className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
        {lines.map(({ product, quantity }) => (
          <li key={product.id} className="flex items-center gap-4 py-5">
            <img
              src={product.imageUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-md bg-stone-100 object-cover"
            />

            <div className="min-w-0 grow">
              <Link
                to={`/products/${product.id}`}
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                {product.name}
              </Link>
              <p className="mt-1 text-sm text-stone-500 tabular-nums">
                {formatPrice(product.priceCents, product.currency)} each
              </p>
              <button
                type="button"
                onClick={() => dispatch({ type: 'remove', productId: product.id })}
                className="mt-2 text-xs text-stone-500 underline underline-offset-4 hover:text-stone-900"
              >
                Remove
              </button>
            </div>

            <QuantityControl
              quantity={quantity}
              onChange={(next) =>
                dispatch({ type: 'setQuantity', productId: product.id, quantity: next })
              }
            />

            <p className="w-24 shrink-0 text-right text-sm tabular-nums">
              {formatPrice(product.priceCents * quantity, product.currency)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col items-end gap-4">
        <p className="text-sm text-stone-600">
          Subtotal{' '}
          <span className="ml-3 text-lg tabular-nums text-stone-900">
            {formatPrice(subtotal, currency)}
          </span>
        </p>

        {order.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {order.error instanceof ApiError
              ? order.error.message
              : 'Your order could not be placed.'}
          </p>
        )}

        {user ? (
          <button
            type="button"
            disabled={order.isPending || lines.length === 0}
            onClick={() => order.mutate()}
            className="rounded-md bg-stone-900 px-8 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {order.isPending ? 'Placing order...' : 'Place order'}
          </button>
        ) : (
          <Link
            to="/sign-in"
            state={{ from: '/cart' }}
            className="rounded-md bg-stone-900 px-8 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
          >
            Sign in to place your order
          </Link>
        )}

        <p className="text-xs text-stone-500">
          Prices are confirmed by the server when the order is placed.
        </p>
      </div>
    </section>
  );
}