import { Routes } from '@angular/router';
// import { StarterComponent } from './starter/starter.component';
import { DashboardComponent } from './dashboard/dashboard.component';

export const PagesRoutes: Routes = [
  {
    path: '',
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
