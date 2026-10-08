import { Routes } from '@angular/router';
import { ProductComponent } from './list-product/ecommerce.component';
import { AddProductComponent } from './add-product/add-product.component';
import { AuthGuard } from 'src/app/auth.guard';
export const ProductsRoutes: Routes = [
    {
        path: '',
        canActivate: [AuthGuard],
        component: ProductComponent,
        data: {
            title: 'Products',
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
        component: AddProductComponent,
        data: {
            title: 'Add Product',
            // breadcrumb: true,
            // urls: [
            //   { title: 'Dashboard', url: '/dashboard' },
            //   { title: 'Starter   xx' },
            // ],
        },
    },
];