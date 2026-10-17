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

let csrfToken: string | null = null;

function send(path: string, init: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      // Fastify rejects a JSON content-type with an empty body, which is what logout sends.
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...init.headers,
    },
  });
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    throw new ApiError(response.status, body.message ?? 'Something went wrong');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function get<T>(path: string): Promise<T> {
  return parse<T>(await send(path, { method: 'GET' }));
}

async function csrf(): Promise<string> {
  csrfToken ??= (await get<{ csrfToken: string }>('/api/auth/csrf-token')).csrfToken;
  return csrfToken;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const init = (token: string): RequestInit => ({
    method: 'POST',
    headers: { 'x-csrf-token': token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let response = await send(path, init(await csrf()));

  // A cached token outlives a server restart or a cleared cookie. One fresh attempt settles it.
  if (response.status === 403) {
    csrfToken = null;
    response = await send(path, init(await csrf()));
  }

  return parse<T>(response);
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
  return get<ProductPage>('/api/products?limit=50');
}

export function getProduct(id: string): Promise<Product> {
  return get<Product>(`/api/products/${id}`);
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    return (await get<{ user: User }>('/api/auth/me')).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function register(email: string, password: string): Promise<User> {
  return (await post<{ user: User }>('/api/auth/register', { email, password })).user;
}

export async function login(email: string, password: string): Promise<User> {
  return (await post<{ user: User }>('/api/auth/login', { email, password })).user;
}

export function logout(): Promise<void> {
  return post<void>('/api/auth/logout');
}