import { Link } from 'react-router-dom';
import type { Product } from '../lib/api';
import { formatPrice } from '../lib/money';

export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock === 0;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-4"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-100">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium tracking-wide text-stone-700">
            Sold out
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-stone-900">{product.name}</h3>
        <span className="shrink-0 text-sm tabular-nums text-stone-600">
          {formatPrice(product.priceCents, product.currency)}
        </span>
      </div>
    </Link>
  );
}