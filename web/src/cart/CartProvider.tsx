import { type ReactNode, useEffect, useMemo, useReducer } from 'react';
import { CartContext, cartReducer, loadCart, saveCart } from './cartStore';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadCart);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const value = useMemo(() => ({ items, dispatch }), [items]);

  return <CartContext value={value}>{children}</CartContext>;
}