export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square rounded-lg bg-stone-200" />
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="h-4 w-2/3 rounded bg-stone-200" />
        <div className="h-4 w-12 rounded bg-stone-200" />
      </div>
    </div>
  );
}