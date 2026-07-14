import { Routes } from '@angular/router';
import { LoginComponent } from './features/pos/pages/login/login.component';
import { HomeComponent } from './features/pos/pages/home/home.component';
import { PosComponent } from './features/pos/pages/pos/pos.component';
import { UnderconstructionpageComponent } from './shared/underconstructionpage/underconstructionpage.component';
import { authRoleGuard } from './core/guards/auth-role.guard';
import { SalesComponent } from './features/pos/pages/sales/sales.component';
import { MainMenuComponent } from './features/pos/pages/home/main-menu/main-menu.component';
import { InvoiceQueryComponent } from './features/pos/pages/invoice-query/invoice-query.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: 'auth/login',
    title: 'ChickenApp - Login',
    component: LoginComponent,
  },
  {
    path: 'main-menu',
    title: 'ChickenApp - Menu',
    canActivate: [authRoleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./features/pos/pages/home/main-menu/main-menu.component').then(
        (m) => m.MainMenuComponent,
      ),
  },
  {
    path: 'home',
    title: 'ChickenApp Home',
    canActivate: [authRoleGuard],
    data: { roles: ['ADMIN', 'POS_USER'] },
    loadComponent: () =>
      import('./features/pos/pages/home/home.component').then(
        (m) => m.HomeComponent,
      ),
    children: [
      {
        path: 'pos',
        title: 'ChickenApp POS',
        canActivate: [authRoleGuard],
        data: { roles: ['ADMIN', 'POS_USER'] },
        loadComponent: () =>
          import('./features/pos/pages/pos/pos.component').then(
            (m) => m.PosComponent,
          ),
      },
      {
        path: 'products',
        title: 'Productos',
        loadComponent: () =>
          import('./features/pos/pages/products/products.component').then(
            (m) => m.ProductsComponent,
          ),
        // component: ProductsComponent,
        //canActivate: [authGuard],
      },
      {
        path: 'customers',
        title: 'Clientes',
        canActivate: [authRoleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/pos/pages/customer/customer.component').then(
            (m) => m.CustomersComponent,
          ),
      },
      {
        path: 'create-product',
        title: 'Nuevo Producto',
        canActivate: [authRoleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/pos/pages/products/components/create-product-form/create-product-form.component').then(
            (m) => m.CreateProductFormComponent,
          ),
        // component: CreateProductFormComponent,
      },
      {
        path: 'create-customer',
        title: 'Nuevo Cliente',
        canActivate: [authRoleGuard],
        data: { roles: ['ADMIN', 'CAJERO'] }, // Ajusta los roles según necesites
        loadComponent: () =>
          import('./features/pos/pages/customer/components/create-customer/create-customer.component').then(
            (m) => m.CreateCustomerComponent,
          ),
      },
      {
        path: 'sales',
        title: 'Ventas',
        canActivate: [authRoleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/pos/pages/sales/sales.component').then(
            (m) => m.SalesComponent,
          ),
      },
      {
        path: 'invoice-query',
        title: 'Consulta de Comprobantes',
        canActivate: [authRoleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/pos/pages/invoice-query/invoice-query.component').then(
            (m) => m.InvoiceQueryComponent,
          ),
      },
    ],
  },
];
