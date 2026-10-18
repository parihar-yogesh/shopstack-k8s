import { useLocation } from 'react-router-dom';

export function useRedirectTarget(): string {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return typeof from === 'string' && from.startsWith('/') ? from : '/';
}