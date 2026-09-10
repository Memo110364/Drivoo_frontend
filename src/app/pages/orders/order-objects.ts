export class city {
  constructor(
    public id: number = 0,
    public city_name: string = '',
    public default_price: number = 0
  ) {}
}
export class area {
  constructor(
    public id: number = 0,
    public name: string = '',
    public price: number = 0
  ) {}
}
export class status_color {
  constructor(
    public color: string = '',
    public text_color: string = '',
    public class_name: string = ''
  ) {}
}

export class OrderList {
  constructor(
    public id: number = 0,
    public Name: string = '',
    public Phone: number = 758269842,
    public order_code: string = '',
    public status: string = "",
    public date: string = '',
    public city: city = {id: 0, city_name: '', default_price: 0},
    public Exchange: string|null = null,
    public status_color: status_color = {color: '', text_color: '', class_name: ''},
    public completed: boolean = false

  ) {}
}
export class OrderItem {
  constructor(
    public id: number = 0,
    // public name: string = '',
    // public unit_price: number = 0,
    // public unit: string = '',
    public total: number = 0,
    public product_name: string = '',
    public image: string = '',
    public quantity: number = 0,
    public option: string = '',
    public status: string = "",
    public status_code: number = 0,
    public rate: number = 0,
    public commission: number = 0,
    public price_effect: number = 0,
    public bonus: number = 0,
    public amount: number = 0,
  ) {}
}
export class OrderFullDetails {
  constructor(
    public id: number = 0,
    public Name: string = 'ahmed',
    public collected: string|null = null,
    public Phone: number = 758269842,
    public order_code: string = 'EGY1000000',
    public Address: string = "test",
    public date: string = "2025-01-14T10:31:23.000000Z",
    public city: city = {id: 11, city_name: "الجيزة", default_price: 80},
    public store: string = "Online Store",
    public notes: string|null = null,
    public confirm_attempted: number = 1,
    public status: string = "",
    public status_color: status_color = {color: "b50000", text_color: "ffffff", class_name: "badge badge-danger"},
    public area: area = {id: 2, name: "6 October", price: 80},
    public items: OrderItem[] = [
      {
        id: 4299886,
        product_name: "test2",
        image: "https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/RRQ35/item_L_33105085_138298590.jpg",
        quantity: 1,
        option: "XL-43",
        status: "REFUNDED",
        status_code: 6,
        rate: 190,
        commission: 20,
        price_effect: 0,
        bonus: 10,
        amount: 210,
        total: 0
    }
    ],
    public is_editable: boolean = false,
    public is_cancelable: boolean = false,
    public is_reactiveable: boolean = false,
    public status_text: string = "REFUNDED",
    public status_code: string = "5",
    public timeline: {
      "create": "14-01-2025",
      "shipping": "14-01-2025",
      "refunded": "28-01-2025"
    }
    // public id: number = 0,
    // public Name: string = '',
    // public Phone: number = 758269842,
    // public order_code: string = '',
    // public status: string = "",
    // public date: string = '',
    // public city: city = {id: 0, city_name: ''},
    // public Exchange: string|null = null,
    // public status_color: status_color = {color: '', text_color: '', class_name: ''},
    // public completed: boolean = false,
    // public orderDate:string = '',
    // public address:string = '',
    // public order_items: OrderItem[] = [],
    // public totalCost: number = 0,
    // public grandTotal: number = 0,
  ) {}
}