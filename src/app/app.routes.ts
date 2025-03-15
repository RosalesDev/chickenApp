import { Routes } from '@angular/router';
import { LoginComponent } from './features/pos/pages/login/login.component';
import { HomeComponent } from './features/pos/pages/home/home.component';
import { authGuard } from './core/guards/auth.guard';
import { PosComponent } from './features/pos/pages/pos/pos.component';
import { ProductsComponent } from './features/pos/pages/products/products.component';
import { CreateProductFormComponent } from './features/pos/pages/products/components/create-product-form/create-product-form.component';
import { UnderconstructionpageComponent } from './shared/underconstructionpage/underconstructionpage.component';

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
    path: 'under-construction',
    title: 'Página en construcción',
    component: UnderconstructionpageComponent,
  },
  {
    path: 'home',
    title: 'ChickenApp Home',
    component: HomeComponent,
    children: [
      {
        path: 'pos',
        title: 'ChickenApp POS',
        component: PosComponent,
        // canActivate: [authGuard],
      },
      {
        path: 'products',
        title: 'Productos',
        loadComponent: () =>
          import('./features/pos/pages/products/products.component').then(
            (m) => m.ProductsComponent
          ),
        // component: ProductsComponent,
        //canActivate: [authGuard],
      },
      {
        path: 'create-product',
        title: 'Nuevo Producto',
        loadComponent: () =>
          import(
            './features/pos/pages/products/components/create-product-form/create-product-form.component'
          ).then((m) => m.CreateProductFormComponent),
        // component: CreateProductFormComponent,
        //canActivate: [authGuard],
      },
    ],
    canActivate: [authGuard],
  },
];
