import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, first, map, of, switchMap } from 'rxjs';

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

  return authService.ready$.pipe(
    // 1. Filtra para solo reaccionar cuando ready$ sea `true`.
    //    Esto evita cualquier estado intermedio.
    filter((ready) => ready),

    // 2. Toma solo la primera señal de `true` para no volver a ejecutar esto en la misma sesión.
    first(),

    // 3. Ahora que estamos seguros de que todo está cargado, nos cambiamos
    //    al observable que verifica los roles.
    switchMap(() => authService.hasAnyRole(requiredRoles)),

    // 4. Mapeamos el resultado final a la decisión del guard.
    map((hasPermission) => {
      if (hasPermission) {
        return true;
      }

      console.warn(
        'Acceso denegado: El usuario no tiene los roles requeridos.'
      );
      router.navigate(['/login']);
      return false;
    })
  );
};
