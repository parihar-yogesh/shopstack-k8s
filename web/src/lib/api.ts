export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ErrorBody {
  message?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    throw new ApiError(response.status, body.message ?? 'Something went wrong');
  }

  return (await response.json()) as T;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  imageUrl: string;
  stock: number;
}

interface ProductPage {
  items: Product[];
  total: number;
}

export function listProducts(): Promise<ProductPage> {
  return request<ProductPage>('/api/products?limit=50');
}

export function getProduct(id: string): Promise<Product> {
  return request<Product>(`/api/products/${id}`);
}