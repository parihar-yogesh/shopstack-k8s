import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '../lib/api';

export const CURRENT_USER_KEY = ['currentUser'];

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
  });
}