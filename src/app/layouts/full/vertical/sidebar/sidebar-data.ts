import { NavItem } from './nav-item/nav-item';

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
      },
      {
        displayName: 'import_orders',
        iconName: 'solar:file-download-outline',
        route: '/orders/import',
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
    route: '/finance/my-wallet',
  },
   {
    id: 5,
    displayName: 'reports',
    iconName: 'solar:chart-bold-duotone',
    route: '/reports',
  },
  {
    id: 6,
    displayName: 'plugins',
    iconName: 'solar:widget-add-line-duotone',
    route: '/plugins',
  },
   {
    id: 7,
    displayName: 'settings',
    iconName: 'solar:settings-linear',
    route: '/settings',
  },
  ]
}
/*
export const navItems: any[] = [
  {
    id: 1,
    name: 'Sample Page',
    children: [
      { navCap: 'Sample Page' },
      {
        displayName: 'Starter',
        iconName: 'solar:widget-add-line-duotone',
        route: '/starter',
      },
    ],
  },
  {
    id: 2,
    name: 'Authentication Pages',
    children: [
      { navCap: 'Auth' },
      {
        displayName: 'Login',
        iconName: 'solar:lock-keyhole-minimalistic-line-duotone',
        route: '/authentication/login',
      },
      {
        displayName: 'Register',
        iconName: 'solar:user-plus-rounded-line-duotone',
        route: '/authentication/side-register',
      },
    ],
  },
  {
    id: 3,
    name: 'Other',
    children: [
      { navCap: 'Other' },
      {
        displayName: 'Menu Level',
        iconName: 'solar:align-horizontal-center-line-duotone',
        route: '/menu-level',
        children: [
          {
            displayName: 'Menu 1',
            iconName: 'solar:round-alt-arrow-right-line-duotone',
            route: '/menu-1',
            children: [
              {
                displayName: 'Menu 1',
                subItemIcon: true,
                iconName: 'solar:round-alt-arrow-right-line-duotone',
                route: '/menu-1',
              },

              {
                displayName: 'Menu 2',
                subItemIcon: true,
                iconName: 'solar:round-alt-arrow-right-line-duotone',
                route: '/menu-2',
              },
            ],
          },

          {
            displayName: 'Menu 2',
            iconName: 'solar:round-alt-arrow-right-line-duotone',
            route: '/menu-2',
          },
        ],
      },
      {
        displayName: 'Disabled',
        iconName: 'solar:bookmark-circle-line-duotone',
        route: '/disabled',
        disabled: true,
      },
      {
        displayName: 'Chip',
        iconName: 'solar:branching-paths-up-line-duotone',
        route: '/',
        chip: true,
        chipClass: 'bg-primary text-white',
        chipContent: '9',
      },
      {
        displayName: 'Outlined',
        iconName: 'solar:add-square-line-duotone',
        route: '/',
        chip: true,
        chipClass: 'bg-primary text-white',
        chipContent: 'outlined',
      },
      {
        displayName: 'External Link',
        iconName: 'solar:link-round-angle-bold-duotone',
        route: 'https://www.google.com/',
        external: true,
      },
    ],
  },
];
*/