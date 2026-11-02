import { Routes } from '@angular/router';
import { PluginsComponent } from './plugins.component';
import { AuthGuard } from 'src/app/auth.guard';
import { loadRemoteModule } from '@angular-architects/native-federation';

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
    path: 'view/:slug',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./plugin-details/plugin-details.component').then(
        (m) => m.PluginDetailsComponent
      ),
    data: {
      title: 'Plugin Details',
    },
  },
  {
    path: 'view/:slug/:q',
    canActivate: [AuthGuard],
    // pathMatch:'prefix',
    loadComponent: () =>
      import('./plugin-details/plugin-details.component').then(
        (m) => m.PluginDetailsComponent
      ),
    data: {
      title: 'Plugin Details',
    },
  },
  // {
  //   path: 'view/:id',
  //   loadComponent: () =>
  //     loadRemoteModule('easyorders', './Component').then(
  //       (m) => m.PluginDetailsComponent
  //     ),
  // },
];

export const PluginsRoutes = ProductsRoutes;