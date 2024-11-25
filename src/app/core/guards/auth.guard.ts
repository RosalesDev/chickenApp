import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const token = localStorage.getItem('token');
  if (!token) {
    router.navigate(['auth/login']);
    return false;
  }

  // Decodificar el token y verificar la fecha de expiración
  const tokenData = JSON.parse(atob(token.split('.')[1])); // Decodifica el payload del JWT
  const isExpired = Date.now() >= tokenData.exp * 1000; // Verifica si está expirado

  if (isExpired) {
    localStorage.removeItem('token'); // Limpia el token
    router.navigate(['auth/login']);
    return false;
  }

  return true; // El token es válido
};
