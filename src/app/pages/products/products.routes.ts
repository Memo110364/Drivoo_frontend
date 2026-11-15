import { Routes } from '@angular/router';
import { ProductComponent } from './list-product/ecommerce.component';
import { AddProductComponent } from './add-product/add-product.component';
import { StockRequestsComponent } from './stock-requests/stock-requests.component';
import { CreateStockRequestComponent } from './stock-requests/create-stock-request/create-stock-request.component';
import { AuthGuard } from 'src/app/auth.guard';

export const ProductsRoutes: Routes = [
    {
        path: '',
        canActivate: [AuthGuard],
        component: ProductComponent,
        data: {
            title: 'Products',
        },
    },
    {
        path: 'create',
        canActivate: [AuthGuard],
        component: AddProductComponent,
        data: {
            title: 'Add Product',
        },
    },
    {
        path: 'stock-requests',
        canActivate: [AuthGuard],
        component: StockRequestsComponent,
        data: {
            title: 'Stock Requests',
        },
    },
    {
        path: ':id/stock-requests',
        canActivate: [AuthGuard],
        component: StockRequestsComponent,
        data: {
            title: 'Product Stock Requests',
        },
    },
    {
        path: ':id/stock-requests/create',
        canActivate: [AuthGuard],
        component: CreateStockRequestComponent,
        data: {
            title: 'Add Product Stock',
        },
    },
];
