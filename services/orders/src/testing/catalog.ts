import type { CatalogProduct, ProductCatalog } from '../catalog/client.js';

export class StubCatalog implements ProductCatalog {
  private readonly products = new Map<string, CatalogProduct>();
  private failure: Error | null = null;

  add(product: CatalogProduct): this {
    this.products.set(product.id, product);
    return this;
  }

  failWith(error: Error): this {
    this.failure = error;
    return this;
  }

  reset(): void {
    this.products.clear();
    this.failure = null;
  }

  async findById(id: string): Promise<CatalogProduct | null> {
    if (this.failure) {
      throw this.failure;
    }
    return this.products.get(id) ?? null;
  }
}