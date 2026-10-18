import { use } from 'react';
import { CartContext } from './cartStore';

export function useCart() {
  const context = use(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside a CartProvider');
  }
  return context;
}