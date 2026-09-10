import { NavItem } from "../nav-item/nav-item";

export function menuItems():NavItem[]{
  return [
    {
    id: 1,
    displayName: 'Orders',
    iconName: 'solar:cart-3-line-duotone',
  },
  {
    id: 2,
    displayName: 'Products',
    iconName: 'solar:box-line-duotone',
  },
  {
    id: 3,
    displayName: 'Finance',
    iconName: 'solar:money-bag-linear',
  },
   {
    id: 4,
    displayName: 'Reports',
    iconName: 'solar:chart-bold-duotone',
  },
   {
    id: 5,
    displayName: 'Settings',
    iconName: 'solar:settings-linear',
  },
  ]
}
// export const menuItems: any[] = [
//   {
//     id: 1,
//     title: 'Sample Page',
//     iconName: 'solar:layers-line-duotone',
//   },
//   {
//     id: 2,
//     title: 'Authentication Pages',
//     iconName: 'solar:lock-keyhole-line-duotone',
//   },
//   {
//     id: 3,
//     title: 'Other',
//     iconName: 'solar:mirror-left-line-duotone',
//   },
// ];
