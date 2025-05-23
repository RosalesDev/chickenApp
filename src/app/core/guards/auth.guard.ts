import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  try {
    await firstValueFrom(authService.ready$);
    const user = authService.getCurrentUser();

    if (user) {
      return true;
    } else {
      throw new Error('No se pudo renovar el token');
    }
  } catch (error) {
    console.error('Error en el guard:', error);
    router.navigate(['auth/login']);
    return false;
  }
};
