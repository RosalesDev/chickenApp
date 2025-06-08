// src/app/shared/directives/has-role.directive.ts
import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import {
  BehaviorSubject,
  combineLatest,
  Subscription,
  switchMap,
  of,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'; // Solo lo necesitamos si la suscripción principal está en el constructor

@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  // Un BehaviorSubject para manejar los roles requeridos reactivamente
  private requiredRolesSubject = new BehaviorSubject<string[]>([]);
  private subscription: Subscription; // Para gestionar la única suscripción principal

  // El setter del input ahora solo actualiza el BehaviorSubject
  @Input() set hasRole(roles: string | string[]) {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    this.requiredRolesSubject.next(rolesArray);
  }

  constructor() {
    // Aquí es donde garantizamos el contexto de inyección para takeUntilDestroyed()
    this.subscription = combineLatest([
      this.authService.ready$, // Esperamos a que AuthService esté listo
      this.authService.userRoles$, // Los roles del usuario actual
      this.requiredRolesSubject, // Los roles que esta directiva requiere
    ])
      .pipe(
        takeUntilDestroyed(), // <-- ¡Ahora sí, en el contexto correcto!
        switchMap(([isAuthReady, userRoles, requiredRoles]) => {
          if (!isAuthReady) {
            // Si el servicio de auth no está listo, no renderizamos el contenido.
            // Opcional: podrías decidir mostrar un spinner o un estado intermedio.
            return of(false);
          }

          if (!userRoles || userRoles.length === 0) {
            return of(false); // Si el usuario no tiene roles, no tiene permisos.
          }

          if (!requiredRoles || requiredRoles.length === 0) {
            return of(true); // Si no se requieren roles, permitir el acceso (o falso, según tu lógica).
          }

          // Verificar si el usuario tiene al menos uno de los roles requeridos
          const hasPermission = requiredRoles.some((role) =>
            userRoles.includes(role)
          );
          return of(hasPermission);
        })
      )
      .subscribe((hasPermission) => {
        if (hasPermission) {
          this.viewContainer.clear();
          this.viewContainer.createEmbeddedView(this.templateRef);
        } else {
          this.viewContainer.clear();
        }
      });
  }

  // Si no usáramos takeUntilDestroyed(), deberíamos desuscribirnos manualmente
  // ngOnDestroy(): void {
  //   if (this.subscription) {
  //     this.subscription.unsubscribe();
  //   }
  // }
}
