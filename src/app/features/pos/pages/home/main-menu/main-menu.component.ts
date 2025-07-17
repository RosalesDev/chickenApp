import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';
import { UserService } from '../../../../../core/user/user.service';

interface MenuOption {
  title: string;
  route: string;
  icon: string; // Ícono de Bootstrap Icons
}

@Component({
  selector: 'app-main-menu',
  imports: [CommonModule, RouterLink],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.scss',
})
export class MainMenuComponent {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  user$ = this.userService.user$;
  router = inject(Router);

  ngOnInit() {
    console.log(this.authService.getUser());
  }
  menuOptions: MenuOption[] = [
    {
      title: 'POS',
      route: '/home/pos',
      icon: 'bi-display', // Ícono para Punto de Venta
    },
    {
      title: 'Ventas',
      route: '/home/sales',
      icon: 'bi-cart-check', // Ícono para Ventas
    },
    {
      title: 'Clientes',
      route: '/under-construction',
      icon: 'bi-people', // Ícono para Clientes
    },
    {
      title: 'Productos',
      route: '/home/products',
      icon: 'bi-box-seam', // Ícono para Productos
    },
  ];

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
