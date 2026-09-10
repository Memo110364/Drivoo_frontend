import { Routes } from '@angular/router';
import { ProductComponent } from './list-product/ecommerce.component';
import { AddProductComponent } from './add-product/add-product.component';

export const ProductsRoutes: Routes = [
    {
        path: '',
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