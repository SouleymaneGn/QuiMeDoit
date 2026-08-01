import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  try {
    const { data } = await supabaseService.getSession();
    if (data.session) {
      return true;
    }
  } catch {
    // Session lookup failed (network/storage issue) — treat as unauthenticated.
  }

  return router.parseUrl('/signin');
};
