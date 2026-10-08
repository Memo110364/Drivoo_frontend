import { Routes } from '@angular/router';
// import { StarterComponent } from './starter/starter.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuthGuard } from '../auth.guard';

export const PagesRoutes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    component: DashboardComponent,
    data: {
      title: 'Dashboard',
      // breadcrumb: true,
      // urls: [
      //   { title: 'Dashboard', url: '/dashboard' },
      //   { title: 'Starter   xx' },
      // ],
    },
  },
];
