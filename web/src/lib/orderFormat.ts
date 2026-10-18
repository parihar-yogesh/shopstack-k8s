export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatOrderNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
}