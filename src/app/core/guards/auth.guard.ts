import { inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../user/model/user-model';

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const loggedUser = signal<User | null>(null);

  const token = localStorage.getItem('token');
  loggedUser.set(await authService.currentUser());
  /*TODO: Revisar por que no encuentra usuario logueado cuando vuelvo a la pagina
        de login sin haber hecho logout*/
  if (!token || loggedUser() == null) {
    router.navigate(['auth/login']);
    return false;
  }

  // Decodificar el token y verificar la fecha de expiración
  const tokenData = JSON.parse(atob(token.split('.')[1])); // Decodifica el payload del JWT
  console.log('Token data: ', tokenData);
  const isExpired = Date.now() >= tokenData.exp * 1000; // Verifica si está expirado

  if (isExpired) {
    localStorage.removeItem('token'); // Limpia el token
    router.navigate(['auth/login']);
    return false;
  }

  return true; // El token es válido
};
