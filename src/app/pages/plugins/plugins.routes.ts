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
            // breadcrumb: true,
            // urls: [
            //   { title: 'Dashboard', url: '/dashboard' },
            //   { title: 'Starter   xx' },
            // ],
        },
        
    },
    {
        path: 'create',
        canActivate: [AuthGuard],
        component: PluginsComponent,
        data: {
            title: 'Add Plugin',
            // breadcrumb: true,
            // urls: [
            //   { title: 'Dashboard', url: '/dashboard' },
            //   { title: 'Starter   xx' },
            // ],
        },
    },
];