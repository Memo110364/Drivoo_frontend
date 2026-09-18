import { Routes } from '@angular/router';
import { ReportsComponent } from './reports.component';
import { ProductMovementComponent } from './product-movement/product-movement.component';

export const ReportsRoutes: Routes = [
  {
    path: '',
    component: ReportsComponent,
    data: {
      title: 'Reports',
    },
  },
  {
    // Drill-down from a product row in the reports screen. It lives under
    // /reports rather than /products because it answers a reporting question —
    // where did this product's stock go — not a catalogue one.
    path: 'product/:id',
    component: ProductMovementComponent,
    data: {
      title: 'Stock Movement',
    },
  },
];
