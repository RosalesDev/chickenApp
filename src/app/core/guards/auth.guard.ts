import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const user = authService.getCurrentUser();

  if (!user) {
    router.navigate(['auth/login']);
    return false;
  }

  try {
    const token = await authService.getFreshToken();
    if (token) {
      // localStorage.setItem('userRole', userData['rol']);
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
