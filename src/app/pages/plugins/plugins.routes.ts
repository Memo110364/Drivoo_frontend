import { Routes } from '@angular/router';
import { PluginsComponent } from './plugins.component';
import { AuthGuard } from 'src/app/auth.guard';

export const ProductsRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    component: PluginsComponent,
    data: {
      title: 'Plugins',
    },
  },
  {
    path: ':id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./plugin-details/plugin-details.component').then(
        (m) => m.PluginDetailsComponent
      ),
    data: {
      title: 'Plugin Details',
    },
  },
];

export const PluginsRoutes = ProductsRoutes;