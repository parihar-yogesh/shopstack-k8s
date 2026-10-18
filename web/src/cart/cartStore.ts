import { createContext, type Dispatch } from 'react';

export interface CartItem {
  productId: string;
  quantity: number;
}

export type CartAction =
  | { type: 'add'; productId: string; quantity: number }
  | { type: 'setQuantity'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

// Mirrors the maximum the orders API accepts for a single line.
export const MAX_QUANTITY = 99;

const STORAGE_KEY = 'shopstack.cart';

function clamp(quantity: number): number {
  return Math.min(Math.max(quantity, 1), MAX_QUANTITY);
}

export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const existing = items.find((item) => item.productId === action.productId);
      if (!existing) {
        return [...items, { productId: action.productId, quantity: clamp(action.quantity) }];
      }
      return items.map((item) =>
        item.productId === action.productId
          ? { ...item, quantity: clamp(item.quantity + action.quantity) }
          : item,
      );
    }
    case 'setQuantity':
      return items.map((item) =>
        item.productId === action.productId ? { ...item, quantity: clamp(action.quantity) } : item,
      );
    case 'remove':
      return items.filter((item) => item.productId !== action.productId);
    case 'clear':
      return [];
  }
}

function isCartItem(value: unknown): value is CartItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CartItem).productId === 'string' &&
    Number.isInteger((value as CartItem).quantity)
  );
}

export function loadCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    // Anything can be in localStorage, including a cart written by an older build.
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private browsing and full storage both throw here. A cart is not worth breaking the page for.
  }
}

export interface CartContextValue {
  items: CartItem[];
  dispatch: Dispatch<CartAction>;
}

export const CartContext = createContext<CartContextValue | null>(null);