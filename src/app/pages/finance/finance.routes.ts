import { Routes } from '@angular/router';
import { WalletComponent } from './wallet/wallet.component';

export const FinanceRoutes: Routes = [
  {
    // The sidebar already points here; until now the route did not exist.
    path: 'my-wallet',
    component: WalletComponent,
    data: { title: 'My Wallet' },
  },
  {
    // The sidebar's withdrawals link lands on the same screen, opened on the
    // requests tab — they are two views of one wallet, not two pages.
    path: 'transfers',
    component: WalletComponent,
    data: { title: 'Transfers', tab: 1 },
  },
  {
    path: '',
    redirectTo: 'my-wallet',
    pathMatch: 'full',
  },
];
