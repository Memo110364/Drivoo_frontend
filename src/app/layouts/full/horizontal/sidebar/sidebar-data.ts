import { NavItem } from '../../vertical/sidebar/nav-item/nav-item';

export function navItems():NavItem[]{
  return [
   
    {
    id: 1,
    displayName: 'dashboard',
    iconName: 'solar:home-2-outline',
    route: '/dashboard',
  },
  {
    id: 2,
    displayName: 'orders',
    iconName: 'solar:cart-3-line-duotone',
    // route: '/orders',
    children: [
      {
        displayName: 'all_orders',
        iconName: 'solar:list-outline',
        route: '/orders',
      },  
      {
        displayName: 'create_order',
        iconName: 'solar:cart-plus-outline',
        route: '/orders/create',
      }
    ]
      },
  {
    id: 3,
    displayName: 'products',
    iconName: 'solar:box-line-duotone',
    children: [
      {
        displayName: 'all_products',
        iconName: 'solar:list-outline',
        route: '/products',
      },  
      {
        displayName: 'create_product',
        iconName: 'system-uicons:box-add',
        route: '/products/create',
      }
    ]
  },
  {
    id: 4,
    displayName: 'finance',
    iconName: 'solar:money-bag-linear',
    children: [
      {
        displayName: 'my_wallets',
        iconName: 'solar:wallet-outline',
        route: '/finance/my-wallet',
      },  
      {
        displayName: 'my_invoices',
        iconName: 'griddy-icons:invoice',
        route: '/finance/my-invoices',
      },  
      {
        displayName: 'transfers',
        iconName: 'uil:money-withdraw',
        route: '/finance/transfers',
      }
    ]
  },
   {
    id: 5,
    displayName: 'reports',
    iconName: 'solar:chart-bold-duotone',
    route: '/reports',
  },
   {
    id: 6,
    displayName: 'settings',
    iconName: 'solar:settings-linear',
    route: '/settings',
  },
  ]
}
// }
// export const navItems: NavItem[] = [
//   {
//     navCap: 'Home',
//   },
//   {
//     displayName: 'Starter',
//     iconName: 'solar:chart-line-duotone',
//     route: '/starter',
//   },
//   {
//     displayName: 'Login',
//     iconName: 'solar:lock-keyhole-minimalistic-unlocked-line-duotone',
//     route: '/authentication/login',
//   },
//   { 
//     navCap: 'Other',
//   },
//   {
//     displayName: 'Menu Level',
//     iconName: 'solar:full-screen-square-line-duotone',
//     route: '/menu-level',
//     children: [
//       {
//         displayName: 'Menu 1',
//         iconName: 'solar:round-alt-arrow-right-line-duotone',
//         route: '/menu-1',
//         children: [
//           {
//             displayName: 'Menu 1',
//             iconName: 'solar:round-alt-arrow-right-line-duotone',
//             route: '/menu-1',
//           },

//           {
//             displayName: 'Menu 2',
//             iconName: 'solar:round-alt-arrow-right-line-duotone',
//             route: '/menu-2',
//           },
//         ],
//       },

//       {
//         displayName: 'Menu 2',
//         iconName: 'solar:round-alt-arrow-right-line-duotone',
//         route: '/menu-2',
//       },
//     ],
//   },
//   {
//     displayName: 'Disabled',
//     iconName: 'solar:archive-minimalistic-line-duotone',
//     route: '/disabled',
//     disabled: true,
//   },
// ];
