import { Routes } from '@angular/router';
import { OrdersListComponent } from './list-order/list-order.component';
import { AddOrderComponent } from './add-order/add-order.component';
import { ViewOrderComponent } from './view-order/view-order.component';
import { EditOrderComponent } from './edit-order/edit-order.component'
import { AuthGuard } from 'src/app/auth.guard';
export const OrdersRoutes: Routes = [
    {
        path: '',
        canActivate: [AuthGuard],
        component: OrdersListComponent,
        data: {
            title: 'Orders',
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
        component: AddOrderComponent,
        data: {
            title: 'Add Order',
            // breadcrumb: true,
            // urls: [
            //   { title: 'Dashboard', url: '/dashboard' },
            //   { title: 'Starter   xx' },
            // ],
        },
    },
    {
        path: 'view/:id',
        canActivate: [AuthGuard],
        component: ViewOrderComponent,
        data: {
            title: 'Order Details',
        },
    },
    {
        path: 'edit/:id',
        canActivate: [AuthGuard],
        component: EditOrderComponent,
        data: {
            title: 'Edit Order',
        },
    },

];