import { Routes } from '@angular/router';

import { AppErrorComponent } from './error/error.component';
import { AppSideLoginComponent } from './side-login/side-login.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { AppSideLogoutComponent } from './side-logout/side-logout.component';
export const AuthenticationRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'error',
        component: AppErrorComponent,
      },

      {
        path: 'login',
        component: AppSideLoginComponent,
      },
      {
        // A Drivoo merchant is onboarded by the team, so there is no self-serve
        // sign-up. The register screen the template shipped with is gone.
        path: 'forgot-password',
        component: ForgotPasswordComponent,
      },
      {
        path: 'logout',
        component: AppSideLogoutComponent,
      },
    ],
  },
];
