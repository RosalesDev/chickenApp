import { Routes } from '@angular/router';
import { LoginComponent } from './features/pos/pages/login/login.component';
import { HomeComponent } from './features/pos/pages/home/home.component';
import { authGuard } from './core/guards/auth.guard';
import { PosComponent } from './features/pos/pages/pos/pos/pos.component';

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
    path: 'home',
    title: 'ChickenApp Home',
    component: HomeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'pos',
    title: 'ChickenApp POS',
    component: PosComponent,
    canActivate: [authGuard],
  },
];
