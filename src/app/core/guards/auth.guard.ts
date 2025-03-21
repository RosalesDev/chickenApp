import { inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user-model';

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const loggedUser = signal<User | null>(null);

  const token = localStorage.getItem('token');

  if (token) {
    const tokenData = JSON.parse(atob(token.split('.')[1])); // Decodifica el payload del JWT
    const isExpired = Date.now() >= tokenData.exp * 1000; // Verifica si está expirado
    if (isExpired) {
      localStorage.removeItem('token'); // Limpia token
      router.navigate(['auth/login']);
      return false;
    }
    return true;
  }

  if (!authService.isLoggedIn()) {
    router.navigate(['auth/login']);
    return false;
  }
  return true;
};
