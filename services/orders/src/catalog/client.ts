export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  currency: string;
  stock: number;
}

export interface ProductCatalog {
  findById(id: string): Promise<CatalogProduct | null>;
}

export class CatalogUnavailableError extends Error {
  constructor(cause: string) {
    super(`products-service is unavailable: ${cause}`);
    this.name = 'CatalogUnavailableError';
  }
}

export class ProductsClient implements ProductCatalog {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = 3000,
  ) {}

  async findById(id: string): Promise<CatalogProduct | null> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/products/${encodeURIComponent(id)}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new CatalogUnavailableError(error instanceof Error ? error.message : 'request failed');
    }

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new CatalogUnavailableError(`responded ${response.status}`);
    }
    return (await response.json()) as CatalogProduct;
  }
}