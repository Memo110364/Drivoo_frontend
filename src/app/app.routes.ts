import { Routes } from '@angular/router';
import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';
import { AuthGuard } from './auth.guard';
export const routes: Routes = [
  {
    path: '',
    component: FullComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full',
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./pages/reports/reports.routes').then((r) => r.ReportsRoutes),
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./pages/pages.routes').then((m) => m.PagesRoutes),
      },
       {
        path: 'products',
        loadChildren: () => import('./pages/products/products.routes').then((r) => r.ProductsRoutes),
      },
      {
        path: 'orders',
        loadChildren: () => import('./pages/orders/orders.routes').then((r) => r.OrdersRoutes),
      },
      // {
      //   path: 'starter',
      //   loadChildren: () =>
      //     import('./pages/pages.routes').then((m) => m.PagesRoutes),
      // },
      // {
      //   path: 'sample-page',
      //   loadChildren: () =>
      //     import('./pages/pages.routes').then((m) => m.PagesRoutes),
      // },
    ],
  },
  {
    path: '',
    component: BlankComponent,
    children: [
      {
        path: 'authentication',
        loadChildren: () =>
          import('./pages/authentication/authentication.routes').then(
            (m) => m.AuthenticationRoutes
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'authentication/error',
  },
];
