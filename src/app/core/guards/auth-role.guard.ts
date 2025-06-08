import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs';

export const authRoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtener los roles requeridos de la data de la ruta
  const requiredRoles = route.data['roles'] as string[];

  if (!requiredRoles || requiredRoles.length === 0) {
    // Si no se especifican roles, permitir el acceso (o lanzar un error, según la lógica de tu app)
    console.warn(
      'AuthRoleGuard: No se especificaron roles requeridos para esta ruta.'
    );
    return true;
  }

  return authService.hasAnyRole(requiredRoles).pipe(
    take(1), // Tomar solo la primera emisión y completar
    map((hasPermission) => {
      if (hasPermission) {
        return true;
      } else {
        // Redirigir al usuario a una página de no autorizado o al inicio
        console.warn(
          'Acceso denegado: El usuario no tiene los roles requeridos.'
        );
        router.navigate(['/login']);
        return false;
      }
    })
  );
};
