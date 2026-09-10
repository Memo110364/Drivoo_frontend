// "id": 1,
//       "name": "Product Name",
//       "img": "https://example.com/product.jpg",
//       "price": 100,
//       "stock": 10,
//       "warning_stock_number": 5,
//       "display_stock": true,
//       "bonus": 2,
//       "net_commission": 10,
//       "favorite": false,
//       "depot": {
//         "id": 1,
//         "name": "المخزن الرئيسي"
//       },
//       "offers": [
//         {
//           "id": 1,
//           "name": "Offer Name",
//           "discount": 10,
//           "start_date": "2025-01-01T22:00:00.000000Z",
//           "end_date": null,
//           "rules": [
//             {
//               "minQ": 3,
//               "bonus": 5,
//               "price": 250,
//               "commission": 30
//             }
//           ]
//         }
//       ]
//     }
class Depot {
    constructor(
        public id: number = 0,
        public name: string = '',
    ) { }
}
class OfferRule {
    constructor(
        public minQ: number = 0,
        public bonus: number = 0,
        public price: number = 0,
        public commission: number = 0,
    ) { }
}
class Offer {
    constructor(
        public id: number = 0,
        public name: string = '',
        public discount: number = 0,
        public start_date: string = '',
        public end_date: string = '',
        public rules: OfferRule[] = [],
    ) { }
}
export class Product {
    constructor(
        public id: number = 0,
        public name: string = '',
        public price: number = 0,
        public stock: number = 0,
        public warning_stock_number: number = 0,
        public display_stock: boolean = false,
        public image: string = '',
        public bonus: number = 0,
        public net_commission: number = 0,
        public favorite: boolean = false,
        public depot: Depot,
        public offers: Offer[] = [],
        public rating: number = 0,
        public numReviews: number = 0,
        public isFeatured: boolean = false,
        public status: string = '',
    ) {}
}
