import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
}
