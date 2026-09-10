import { Routes } from '@angular/router';
import { OrdersListComponent } from './list-order/list-order.component';
import { AddOrderComponent } from './add-order/add-order.component';
import { ViewOrderComponent } from './view-order/view-order.component';
import { EditOrderComponent } from './edit-order/edit-order.component'
export const OrdersRoutes: Routes = [
    {
        path: '',
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
        component: ViewOrderComponent,
        data: {
            title: 'Order Details',
        },
    },
    {
        path: 'edit/:id',
        component: EditOrderComponent,
        data: {
            title: 'Order Details',
        },
    },

];