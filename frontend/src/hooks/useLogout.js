import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Returns a stable logout() function that:
 *   1. Clears access_token + refresh_token from localStorage (via AuthContext).
 *   2. Wipes the entire React Query cache so no private data
 *      (cart, orders, farmer profile) lingers in memory.
 *   3. Navigates to /login and replaces the history entry so the
 *      back-button cannot return to a protected page.
 */
export function useLogout() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate    = useNavigate();

  return useCallback(() => {
    logout();                          // 1. clear localStorage + flip isAuthenticated
    queryClient.clear();               // 2. nuke every cached query and mutation
    navigate('/login', { replace: true }); // 3. redirect
  }, [logout, queryClient, navigate]);
}
