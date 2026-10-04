# توثيق الـ API الكامل لمنظومة Drivoo (Backend API Specification)

هذا الملف يحتوي على التوثيق الشامل لجميع الـ Endpoints المطلوبة لتشغيل واجهة المستخدم بالكامل، متضمناً مسارات الـ API، أساليب الطلب (HTTP Methods)، المعاملات (Parameters/Headers)، وهيكل البيانات المرسلة والمستقبلة (Request & Response Payloads).

---

## 📑 فهرس الأقسام والمسارات (API Overview & Index)

| القسم | الـ Endpoints الرئيسية | الوصف |
| :--- | :--- | :--- |
| **🔐 1. المصادقة (Auth)** | `POST /user/login`<br>`POST /auth/refresh` | تسجيل الدخول وتوليد/تجديد `accessToken` و `refreshToken` |
| **📊 2. لوحة التحكم (Dashboard)** | `GET /dashboard`<br>`GET /reports/dashboard/orders-status`<br>`GET /reports/dashboard/orders-last-thirty-days` | مؤشرات الأداء (KPIs)، ومخطط توزيع الحالات، ورسم بياني لآخر 30 يوم |
| **🚚 3. اللوجستيات (Logistics)** | `GET /logistics/cities` | قائمة المحافظات مع المناطق الفرعية وأسعار الشحن الافتراضية |
| **📦 4. الطلبات (Orders)** | `GET /orders`<br>`GET /orders/count-by-status`<br>`GET /orders/{id}`<br>`POST /orders`<br>`PUT /orders/{id}`<br>`DELETE /orders/{id}` | استعراض الطلبات (مع الفلترة والترقيم)، إحصائيات الحالات، تفاصيل الطلب مع بنود المنتجات وسجل الحالات (Timeline)، والإضافة/التعديل/الحذف |
| **🏷️ 5. المنتجات (Products)** | `GET /products/list`<br>`GET /products/categories/list`<br>`GET /products/view/{id}`<br>`POST /products`<br>`PUT /products/{id}`<br>`DELETE /products/{id}` | استعراض الكتالوج مع الفلترة والترتيب، التصنيفات، العروض الخاصة (Offers & Rules)، وإدارة المنتجات |
| **💰 6. المحفظة والمالية (Wallet & Finance)** | `GET /wallet/balance`<br>`GET /wallet/ledger`<br>`GET /finance/uninvoiced`<br>`GET /finance/invoices/list`<br>`GET /finance/invoices/details/{id}`<br>`GET /wallet/payment-methods`<br>`POST /wallet/payment-methods`<br>`DELETE /wallet/payment-methods/{id}`<br>`PUT /wallet/payment-methods/{id}/default`<br>`GET /wallet/cash-branches`<br>`GET /wallet/withdrawal-options`<br>`GET /wallet/withdrawals`<br>`POST /wallet/withdrawals`<br>`GET /finance/method` | أرصدة المحفظة (إجمالي، معلق، متاح)، كشف حساب الحركات (Ledger) بالرصيد التراكمي، الفواتير والحركات غير المفوترة، وسائل السحب، فروع الاستلام، وقواعد وأهلية طلبات السحب ومتابعة مراحل التحويل (Timeline) |
| **📈 7. التقارير والإحصائيات (Reports & Analytics)** | `GET /reports/summary`<br>`GET /reports/orders-over-time`<br>`GET /reports/status-breakdown`<br>`GET /reports/performance/{groupBy}`<br>`GET /reports/returns-by-reason`<br>`GET /reports/cancellation-reasons`<br>`GET /reports/confirmation-funnel`<br>`GET /reports/confirmation-by-product`<br>`GET /reports/inventory`<br>`GET /reports/inventory-movements/{productId}`<br>`GET /reports/orders` | تقارير شاملة مع فلاتر التاريخ والمدينة: ملخص الأداء ومعدلات التسليم والمرتجع، جداول المقارنة (`carrier`, `city`, `area`, `product`, `store`)، أسباب المرتجعات والإلغاء، مسار تأكيد الطلبات، لقطة المخزون، وسجل حركة مخزون كل منتج وتصدير كامل البيانات |

---

## 📌 1. معلومات عامة والاتفاقيات الأساسية (General Conventions)

* **Base URL الافتراضي**: `http://localhost:3000/api/v1/` أو المسار النسبي `/api/v1/`
* **صيغة تبادل البيانات**: `application/json; charset=utf-8`
* **المصادقة (Authentication)**: 
  * جميع الـ Endpoints (باستثناء مسارات تسجيل الدخول) تتطلب إرسال الـ Access Token في الـ Headers:
    ```http
    Authorization: Bearer <access_token>
    ```
* **صيغة التواريخ**: `ISO 8601` (مثال: `2025-01-14T10:31:23.000000Z` أو `YYYY-MM-DD` لفلاتر التقارير).
* **صيغة المبالغ والعملات**: الأرقام العشرية/الصحيحة بالجنيه المصري (EGP).
* **الأخطاء القياسية (Standard Error Response)**:
  ```json
  {
    "status": 400,
    "message": "وصف الخطأ أو كود الخطأ",
    "errors": {
      "field_name": ["رسالة الخطأ الخاصة بالحقل"]
    }
  }
  ```

---

## 🔐 2. المصادقة والتحقق (Authentication)

### 2.1 تسجيل الدخول (Login)
* **Endpoint**: `POST /user/login`
* **الوصف**: تسجيل دخول التاجر واستخراج الـ Tokens والبيانات الأساسية.
* **Request Body**:
  ```json
  {
    "username": "mahmoud@example.com",
    "password": "Password123"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "id": "123324",
    "name": "محمود حسن",
    "email": "mahmoud@example.com",
    "phone": "01000000000",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "refreshToken": "d7a8e9f0-b1c2-3d4e-5f6a-7b8c9d0e1f2a"
  }
  ```

### 2.2 تجديد التوكن (Refresh Access Token)
* **Endpoint**: `POST /auth/refresh`
* **الوصف**: تجديد صلاحية الـ Access Token بعد انتهائه (يتم استدعاؤه تلقائياً بواسطة الـ Interceptor عند كود 401).
* **Request Body**:
  ```json
  {
    "refreshToken": "d7a8e9f0-b1c2-3d4e-5f6a-7b8c9d0e1f2a"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
  ```

---

## 📊 3. لوحة التحكم (Dashboard)

### 3.1 بطاقات الأداء والمؤشرات الرئيسية (KPI Cards)
* **Endpoint**: `GET /dashboard`
* **Response (200 OK)**:
  ```json
  {
    "total_orders": "1250",
    "revenue": "345000",
    "delivery_rate": "84.5%",
    "return_rate": "11.2%",
    "average_delivery": "2.4 days",
    "net_profit": "78500"
  }
  ```

### 3.2 توزيع حالات الطلبات الحالية (Orders Status Breakdown)
* **Endpoint**: `GET /reports/dashboard/orders-status`
* **Response (200 OK)**:
  ```json
  {
    "total": 1250,
    "status": [
      { "name": "pending", "value": 150 },
      { "name": "shipped", "value": 300 },
      { "name": "delivered", "value": 720 },
      { "name": "failed", "value": 80 }
    ]
  }
  ```

### 3.3 اتجاه الطلبات خلال آخر 30 يوماً (Orders Chart Last 30 Days)
* **Endpoint**: `GET /reports/dashboard/orders-last-thirty-days`
* **Response (200 OK)**:
  ```json
  {
    "orders": [12, 18, 15, 22, 30, 25, 28, 35, 40, 32, 28, 45, 50, 48, 52, 49, 60, 55, 58, 62, 70, 65, 68, 72, 75, 80, 85, 78, 90, 95]
  }
  ```

---

## 🚚 4. اللوجستيات والمناطق (Logistics & Geography)

### 4.1 قائمة المحافظات والمدن والمناطق (Cities & Areas)
* **Endpoint**: `GET /logistics/cities`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "city_name": "القاهرة",
        "default_price": 60,
        "areas": [
          { "id": 101, "name": "مدينة نصر", "price": 60 },
          { "id": 102, "name": "المعادي", "price": 60 },
          { "id": 103, "name": "التجمع الخامس", "price": 70 }
        ]
      },
      {
        "id": 2,
        "city_name": "الجيزة",
        "default_price": 65,
        "areas": [
          { "id": 201, "name": "الدقي", "price": 65 },
          { "id": 202, "name": "6 أكتوبر", "price": 80 },
          { "id": 203, "name": "الشيخ زايد", "price": 80 }
        ]
      }
    ]
  }
  ```

---

## 📦 5. إدارة الطلبات (Orders Management)

### 5.1 استعراض قائمة الطلبات مع الفلترة والترقيم (List Orders)
* **Endpoint**: `GET /orders`
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 10)
  * `statusFilter` (string, comma-separated IDs, e.g. `1,2,6`)
  * `searchQuery` (string, optional - search by name, code or phone)
* **Response (200 OK)**:
  ```json
  {
    "recordsTotal": 1450,
    "data": [
      {
        "id": 1001,
        "Name": "أحمد علي",
        "Phone": 1012345678,
        "order_code": "EGY1000100",
        "status": "DELIVERED",
        "date": "2025-01-14T10:31:23.000000Z",
        "city": {
          "id": 1,
          "city_name": "القاهرة",
          "default_price": 60
        },
        "Exchange": null,
        "status_color": {
          "color": "28a745",
          "text_color": "ffffff",
          "class_name": "badge badge-success"
        },
        "completed": true
      }
    ]
  }
  ```

### 5.2 إحصائيات أعداد الطلبات حسب الحالات (Order Status Count)
* **Endpoint**: `GET /orders/count-by-status?status=1,2,3,4,5,6,7,8,9`
* **Response (200 OK)** (كائن يحتوي على مفتاح لكل كود حالة وعدده):
  ```json
  {
    "1": 45,
    "2": 12,
    "3": 210,
    "4": 15,
    "5": 8,
    "6": 5,
    "7": 85,
    "8": 3,
    "9": 450
  }
  ```

### 5.3 تفاصيل طلب محدد (Get Order Details)
* **Endpoint**: `GET /orders/{id}`
* **Response (200 OK)**:
  ```json
  {
    "id": 1001,
    "Name": "أحمد علي",
    "collected": "580",
    "Phone": 1012345678,
    "order_code": "EGY1000100",
    "Address": "شارع النصر، مبنى 14",
    "date": "2025-01-14T10:31:23.000000Z",
    "city": {
      "id": 1,
      "city_name": "القاهرة",
      "default_price": 60
    },
    "area": {
      "id": 101,
      "name": "مدينة نصر",
      "price": 60
    },
    "store": "Online Store",
    "notes": "الاتصال قبل التوصيل",
    "confirm_attempted": 1,
    "status": "DELIVERED",
    "status_text": "تم التسليم",
    "status_code": "9",
    "status_color": {
      "color": "28a745",
      "text_color": "ffffff",
      "class_name": "badge badge-success"
    },
    "is_editable": false,
    "is_cancelable": false,
    "is_reactiveable": false,
    "timeline": {
      "create": "14-01-2025",
      "confirmed": "14-01-2025",
      "shipping": "15-01-2025",
      "delivered": "17-01-2025"
    },
    "items": [
      {
        "id": 5001,
        "product_name": "قميص قطن أبيض",
        "image": "https://example.com/item1.jpg",
        "quantity": 2,
        "option": "XL - أبيض",
        "status": "DELIVERED",
        "status_code": 9,
        "rate": 250,
        "commission": 30,
        "price_effect": 0,
        "bonus": 10,
        "amount": 500,
        "total": 500
      }
    ]
  }
  ```

### 5.4 إنشاء طلب جديد (Create Order)
* **Endpoint**: `POST /orders`
* **Request Body**:
  ```json
  {
    "name": "محمود سمير",
    "phone": "01012345678, 01198765432",
    "city_id": 1,
    "area_id": 101,
    "address": "عمارة 5 شارع الطيران",
    "notes": "يرجى ترك الشحنة لدى الحارس إن لم أكن متواجداً",
    "items": [
      {
        "product_name": "حذاء رياضي",
        "image": "https://example.com/shoes.jpg",
        "option": "43 - أسود",
        "rate": 450,
        "quantity": 1,
        "status": "PENDING",
        "status_code": 1
      }
    ]
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "status": 201,
    "message": "Order created successfully",
    "data": {
      "id": 1002,
      "order_code": "EGY1000101"
    }
  }
  ```

### 5.5 تعديل طلب (Update Order)
* **Endpoint**: `PUT /orders/{id}`
* **Request Body**: نفس هيكل بيانات الـ Create.
* **Response (200 OK)**:
  ```json
  {
    "message": "Order updated successfully"
  }
  ```

### 5.6 حذف طلب (Delete Order)
* **Endpoint**: `DELETE /orders/{id}`
* **Response (200 OK)**:
  ```json
  {
    "message": "Order deleted successfully"
  }
  ```

---

## 🏷️ 6. إدارة المنتجات والتصنيفات (Products & Categories)

### 6.1 استعراض قائمة المنتجات (List Products)
* **Endpoint**: `GET /products/list`
* **Query Parameters**:
  * `page` (number, default: 1)
  * `limit` (number, default: 24)
  * `filter[category]` (string, optional)
  * `filter[status]` (string, optional)
  * `searchQuery` (string, optional)
  * `sort_by` (string, optional - e.g. `price`, `created_at`, `discount`)
  * `sort_by_direction` (string: `asc` | `desc`)
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "ساعة ذكية مقاومة للماء",
        "price": 850,
        "stock": 45,
        "warning_stock_number": 10,
        "display_stock": true,
        "image": "https://example.com/watch.jpg",
        "bonus": 25,
        "net_commission": 85,
        "favorite": false,
        "status": "ACTIVE",
        "rating": 4.8,
        "numReviews": 34,
        "isFeatured": true,
        "depot": {
          "id": 1,
          "name": "المخزن الرئيسي"
        },
        "offers": [
          {
            "id": 10,
            "name": "عرض الجملة 3 قطع",
            "discount": 10,
            "start_date": "2025-01-01T00:00:00.000000Z",
            "end_date": null,
            "rules": [
              {
                "minQ": 3,
                "bonus": 40,
                "price": 750,
                "commission": 100
              }
            ]
          }
        ]
      }
    ]
  }
  ```

### 6.2 قائمة التصنيفات (Product Categories)
* **Endpoint**: `GET /products/categories/list?status=true`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      { "id": 1, "name": "إلكترونيات", "icon": "device-laptop" },
      { "id": 2, "name": "أزياء وملابس", "icon": "shirt" },
      { "id": 3, "name": "ساعات وإكسسوارات", "icon": "watch" },
      { "id": 4, "name": "الصحة والجمال", "icon": "sparkles" }
    ]
  }
  ```

### 6.3 استعراض تفاصيل منتج (View Product)
* **Endpoint**: `GET /products/view/{id}`
* **Response (200 OK)**: يعيد كائن المنتج الكامل كما في بند 6.1 مع المعرض والصور المتعددة وخيارات المنتج.

### 6.4 إنشاء / تعديل منتج (Create / Update Product)
* **Endpoint**: `POST /products` (أو `PUT /products/{id}`)
* **Request Body**:
  ```json
  {
    "product_name": "ساعة يد كلاسيكية",
    "description": "<p>وصف كامل للمنتج بتنسيق HTML</p>",
    "base_price": 500,
    "size": "M",
    "variations": "أسود, بني",
    "discount_type": "Percentage %",
    "set_discount_percentage": 10,
    "fixed_discounted_price": 450,
    "tax_class": "Taxable Goods",
    "VAT_amount": 14,
    "status": true,
    "categories": "ساعات وإكسسوارات",
    "default_template": "Default template",
    "tags": ["ساعات", "رجالي", "إكسسوار"],
    "Thumbnail": ["https://example.com/thumb.jpg"],
    "media": ["https://example.com/pic1.jpg", "https://example.com/pic2.jpg"]
  }
  ```
* **Response (200 OK / 201 Created)**:
  ```json
  {
    "message": "Product saved successfully",
    "data": { "id": 205 }
  }
  ```

### 6.5 حذف منتج (Delete Product)
* **Endpoint**: `DELETE /products/{id}`
* **Response (200 OK)**:
  ```json
  {
    "message": "Product deleted successfully"
  }
  ```

---

## 💰 7. المحفظة والمالية (Wallet & Finance)

### 7.1 رصيد المحفظة (Wallet Balance)
* **Endpoint**: `GET /wallet/balance`
* **Response (200 OK)**:
  ```json
  {
    "currency": "EGP",
    "total": 35400,
    "pending": 10150,
    "available": 25250
  }
  ```

### 7.2 كشف حساب المحفظة (Wallet Ledger)
* **Endpoint**: `GET /wallet/ledger`
* **Query Parameters**:
  * `from` (string: YYYY-MM-DD)
  * `to` (string: YYYY-MM-DD)
  * `type` (string: `order_payout` | `withdrawal` | `shipping_fee` | `return_shipping` | `opening_balance` | `other_service`)
  * `page` (number)
  * `limit` (number)
* **Response (200 OK)**:
  ```json
  {
    "page": 1,
    "limit": 25,
    "total": 120,
    "data": [
      {
        "id": "led-001",
        "date": "2025-01-20T14:30:00.000Z",
        "type": "order_payout",
        "amount": 750,
        "balance": 25250,
        "reference": "EGY1000085",
        "reference_type": "order"
      },
      {
        "id": "led-002",
        "date": "2025-01-19T11:00:00.000Z",
        "type": "withdrawal",
        "amount": -5000,
        "balance": 24500,
        "reference": "WDR-9921",
        "reference_type": "withdrawal"
      },
      {
        "id": "led-003",
        "date": "2025-01-18T09:15:00.000Z",
        "type": "shipping_fee",
        "amount": -65,
        "balance": 29500,
        "reference": "INV-2025-01",
        "reference_type": "invoice"
      }
    ]
  }
  ```

### 7.3 الحركات غير المفوترة (Uninvoiced Transactions)
* **Endpoint**: `GET /finance/uninvoiced`
* **Query Parameters**: `from`, `to`, `type`, `page`, `limit`
* **Response (200 OK)**:
  ```json
  {
    "page": 1,
    "limit": 20,
    "total": 35,
    "data": [
      {
        "id": "uninv-101",
        "created_at": "2025-01-22T10:00:00.000Z",
        "type": "shipping_fee",
        "cost": "-70",
        "reference": "EGY1000109",
        "reference_type": "order"
      }
    ]
  }
  ```

### 7.4 قائمة الفواتير (Invoices List)
* **Endpoint**: `GET /finance/invoices/list`
* **Query Parameters**: `from`, `to`, `page`, `limit`
* **Response (200 OK)**:
  ```json
  {
    "page": 1,
    "limit": 10,
    "total": 12,
    "data": [
      {
        "id": "inv-2025-001",
        "date": "2025-01-15",
        "status": "PAID",
        "amount": 4250,
        "invoice_number": "INV-2025-001"
      }
    ]
  }
  ```

### 7.5 تفاصيل فاتورة (Invoice Details)
* **Endpoint**: `GET /finance/invoices/details/{id}`
* **Response (200 OK)**:
  ```json
  {
    "id": "inv-2025-001",
    "date": "2025-01-15",
    "status": "PAID",
    "amount": 4250,
    "invoice_number": "INV-2025-001",
    "items": [
      {
        "id": "item-1",
        "service_name": "مصاريف شحن طلبات مسلّمة",
        "cost": 3800,
        "reference": "EGY-BATCH-01",
        "reference_type": "order_batch"
      }
    ],
    "additionals": [
      {
        "id": "add-1",
        "description": "تغليف كرتوني مخصص",
        "note": "شحنة 50 قطعة",
        "cost": 450
      }
    ]
  }
  ```

### 7.6 وسائل السحب وقنوات الدفع (Payout Methods)
* **Endpoint**: `GET /wallet/payment-methods`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "pm-1",
        "type": "bank_account",
        "label": "البنك الأهلي المصري - محمود حسن",
        "masked_identifier": "•••• 5821",
        "details": {
          "bank_name": "البنك الأهلي المصري",
          "branch": "فرع المهندسين"
        },
        "is_default": true,
        "status": "active",
        "created_at": "2024-11-10T12:00:00.000Z"
      },
      {
        "id": "pm-2",
        "type": "vodafone_cash",
        "label": "محفظة فودافون كاش",
        "masked_identifier": "010•••••842",
        "details": {},
        "is_default": false,
        "status": "active",
        "created_at": "2024-12-01T15:30:00.000Z"
      },
      {
        "id": "pm-3",
        "type": "instapay",
        "label": "حساب إنستاباي IPA",
        "masked_identifier": "mahmoud@instapay",
        "details": {},
        "is_default": false,
        "status": "active",
        "created_at": "2025-01-05T09:00:00.000Z"
      }
    ]
  }
  ```

### 7.7 إضافة وسيلة سحب جديدة (Add Payment Method)
* **Endpoint**: `POST /wallet/payment-methods`
* **Request Body** (حسب النوع):
  * **Bank Account**:
    ```json
    {
      "type": "bank_account",
      "holder_name": "محمود حسن محمد",
      "bank_name": "البنك التجاري الدولي CIB",
      "account_number": "100029384812",
      "branch": "المعادي"
    }
    ```
  * **Vodafone Cash**:
    ```json
    {
      "type": "vodafone_cash",
      "holder_name": "محمود حسن",
      "phone": "01012345678"
    }
    ```
  * **InstaPay**:
    ```json
    {
      "type": "instapay",
      "holder_name": "محمود حسن",
      "instapay_address": "mahmoud@instapay"
    }
    ```
  * **Cash (استلام نقدي من فرع)**:
    ```json
    {
      "type": "cash",
      "holder_name": "محمود حسن",
      "branch_id": "branch-cairo-01"
    }
    ```
* **Response (200 OK)**:
  ```json
  {
    "message": "تمت إضافة وسيلة الاستلام بنجاح"
  }
  ```

### 7.8 ضبط وسيلة سحب افتراضية أو حذفها
* **تعيين افتراضية**: `PUT /wallet/payment-methods/{id}/default` (Body: `{}`)
* **حذف وسيلة**: `DELETE /wallet/payment-methods/{id}`

### 7.9 فروع الاستلام النقدي (Cash Collection Branches)
* **Endpoint**: `GET /wallet/cash-branches`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "branch-cairo-01",
        "label": "فرع القاهرة الرئيسي - مدينة نصر",
        "address": "45 شارع مكرم عبيد، المنطقة السادسة",
        "hours": "السبت إلى الخميس: 9:00 ص - 6:00 م"
      },
      {
        "id": "branch-giza-01",
        "label": "فرع الجيزة - المهندسين",
        "address": "12 شارع سوريا، المهندسين",
        "hours": "السبت إلى الخميس: 9:00 ص - 6:00 م"
      }
    ]
  }
  ```

### 7.10 قواعد وأهلية طلب السحب (Withdrawal Options & Rules)
* **Endpoint**: `GET /wallet/withdrawal-options`
* **Response (200 OK)**:
  ```json
  {
    "rules": {
      "minimum_amount": 500,
      "maximum_amount": null,
      "fees": {
        "bank_account": 15,
        "vodafone_cash": 10,
        "instapay": 0,
        "cash": 0
      },
      "allow_concurrent_requests": false,
      "transfer_days": [0, 2, 4],
      "expected_days": 2
    },
    "eligibility": {
      "can_request": true,
      "reason": null,
      "context": {},
      "available": 25250,
      "next_transfer_date": "2025-01-26"
    }
  }
  ```
  *(في حال عدم الأهلية تكون `can_request: false` و `reason` أحد الأكواد التالية: `request_in_progress`, `below_minimum`, `no_payment_method` مع ملء كائن `context` بالأرقام المطلوبة).*

### 7.11 سجل طلبات السحب (List Withdrawal Requests)
* **Endpoint**: `GET /wallet/withdrawals`
* **Response (200 OK)**:
  ```json
  {
    "page": 1,
    "limit": 10,
    "total": 4,
    "data": [
      {
        "id": "wdr-101",
        "code": "110642",
        "amount": 5000,
        "fee": 15,
        "net_amount": 4985,
        "status": "transferring",
        "created_at": "2025-01-20T10:00:00.000Z",
        "expected_at": "2025-01-22T18:00:00.000Z",
        "method": {
          "id": "pm-1",
          "type": "bank_account",
          "label": "البنك الأهلي المصري",
          "masked_identifier": "•••• 5821"
        },
        "timeline": [
          { "stage": "submitted", "at": "2025-01-20T10:00:00.000Z" },
          { "stage": "under_review", "at": "2025-01-20T14:30:00.000Z" },
          { "stage": "transferring", "at": "2025-01-21T09:00:00.000Z" }
        ]
      }
    ]
  }
  ```

### 7.12 تقديم طلب سحب جديد (Request Withdrawal)
* **Endpoint**: `POST /wallet/withdrawals`
* **Request Body**:
  ```json
  {
    "amount": 5000,
    "payment_method_id": "pm-1"
  }
  ```
* **Response (200 OK / 201 Created)**:
  ```json
  {
    "message": "تم استلام طلب السحب بنجاح",
    "code": "110643"
  }
  ```

### 7.13 تكوين حقول طرق السحب الديناميكية (Dynamic Finance Methods Config)
* **Endpoint**: `GET /finance/method`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "name": "حساب بنكي",
        "icon": "building-bank",
        "minimum_request": 500,
        "fields": [
          { "key": "holder_name", "name": "اسم صاحب الحساب", "type": "text", "required": true },
          { "key": "bank_name", "name": "اسم البنك", "type": "text", "required": true },
          { "key": "account_number", "name": "رقم الحساب / IBAN", "type": "text", "regex": "^[0-9A-Z]{10,34}$", "required": true },
          { "key": "branch", "name": "الفرع", "type": "text", "required": false }
        ]
      }
    ]
  }
  ```

---

## 📈 8. التقارير والتحليلات (Reports & Analytics)

جميع طلبات التقارير تقبل فلاتر التاريخ والمدينة:
* `from` (string: YYYY-MM-DD, e.g. `2025-01-01`)
* `to` (string: YYYY-MM-DD, e.g. `2025-01-31`)
* `city_id` (string, optional)

### 8.1 ملخص أداء الفترة (Reports Summary KPIs)
* **Endpoint**: `GET /reports/summary?from=2025-01-01&to=2025-01-31`
* **Response (200 OK)**:
  ```json
  {
    "total_orders": 1250,
    "shipped": 1100,
    "delivered": 920,
    "returned": 130,
    "awaiting_shipment": 50,
    "cancelled": 100,
    "revenue": 385000,
    "cod_collected": 342000,
    "delivery_success_rate": 87.62,
    "return_rate": 12.38,
    "avg_delivery_days": 2.3
  }
  ```

### 8.2 تطور الطلبات عبر الزمن (Orders Over Time)
* **Endpoint**: `GET /reports/orders-over-time?from=2025-01-01&to=2025-01-31`
* **Response (200 OK)**:
  ```json
  {
    "labels": ["01 Jan", "05 Jan", "10 Jan", "15 Jan", "20 Jan", "25 Jan", "30 Jan"],
    "total": [45, 60, 55, 80, 95, 70, 85],
    "shipped": [40, 55, 50, 75, 90, 65, 80],
    "delivered": [35, 48, 42, 68, 80, 58, 72],
    "returned": [5, 7, 8, 7, 10, 7, 8]
  }
  ```

### 8.3 توزيع حالات الطلبات (Status Breakdown)
* **Endpoint**: `GET /reports/status-breakdown?from=2025-01-01&to=2025-01-31`
* **Response (200 OK)**:
  ```json
  {
    "total": 1250,
    "data": [
      { "group": "delivered", "count": 920, "percentage": 73.6 },
      { "group": "returned", "count": 130, "percentage": 10.4 },
      { "group": "in_shipping", "count": 150, "percentage": 12.0 },
      { "group": "cancelled", "count": 50, "percentage": 4.0 }
    ]
  }
  ```

### 8.4 تقارير المقارنة والأداء (Performance Comparison Table)
* **Endpoint**: `GET /reports/performance/{groupBy}`
  * `groupBy` يمكن أن تكون: `carrier` | `city` | `area` | `product` | `store`
* **Response (200 OK)**:
  ```json
  {
    "group_by": "carrier",
    "data": [
      {
        "key": "carr-1",
        "label": "سريع إكسبرس",
        "orders": 650,
        "shipped": 650,
        "delivered": 580,
        "returned": 70,
        "delivery_success_rate": 89.23,
        "return_rate": 10.77,
        "avg_delivery_days": 2.1,
        "revenue": 210000,
        "total_stock": 0,
        "current_stock": 0,
        "warning_stock_number": 0
      }
    ]
  }
  ```
  *(ملاحظة: في حالة `groupBy = product` يتم ملء حقول المخزون `total_stock`, `current_stock`, `warning_stock_number`).*

### 8.5 أسباب المرتجعات (Returns By Reason)
* **Endpoint**: `GET /reports/returns-by-reason?from=2025-01-01&to=2025-01-31`
* **Response (200 OK)**:
  ```json
  {
    "total": 130,
    "data": [
      { "code": "customer_refused", "count": 65, "percentage": 50.0 },
      { "code": "unreachable", "count": 35, "percentage": 26.92 },
      { "code": "wrong_address", "count": 15, "percentage": 11.54 },
      { "code": "item_mismatch", "count": 10, "percentage": 7.69 },
      { "code": "other", "count": 5, "percentage": 3.85 }
    ]
  }
  ```

### 8.6 أسباب الإلغاء قبل الشحن (Cancellation Reasons)
* **Endpoint**: `GET /reports/cancellation-reasons?from=2025-01-01&to=2025-01-31`
* **Response (200 OK)**:
  ```json
  {
    "total": 50,
    "data": [
      { "code": "unreachable", "count": 22, "percentage": 44.0 },
      { "code": "customer_changed_mind", "count": 15, "percentage": 30.0 },
      { "code": "price_objection", "count": 8, "percentage": 16.0 },
      { "code": "duplicate_order", "count": 5, "percentage": 10.0 }
    ]
  }
  ```

### 8.7 مسار التأكيد ومحاولات الاتصال (Confirmation Funnel)
* **Endpoint**: `GET /reports/confirmation-funnel?from=2025-01-01&to=2025-01-31`
* **Response (200 OK)**:
  ```json
  {
    "placed": 1300,
    "confirmed": 1150,
    "shipped": 1100,
    "delivered": 920,
    "lost_at_confirmation": 150,
    "attempts": [
      { "attempts": 1, "orders": 850 },
      { "attempts": 2, "orders": 200 },
      { "attempts": 3, "orders": 100 }
    ]
  }
  ```

### 8.8 جودة تأكيد الطلبات لكل منتج (Confirmation By Product)
* **Endpoint**: `GET /reports/confirmation-by-product?from=2025-01-01&to=2025-01-31`
* **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "prod-101",
        "label": "ساعة يد كلاسيكية",
        "placed": 300,
        "confirmed": 275,
        "lost": 25,
        "confirmation_rate": 91.67,
        "avg_attempts": 1.3
      }
    ]
  }
  ```

### 8.9 لقطة المخزون العام (Inventory Snapshot)
* **Endpoint**: `GET /reports/inventory`
* **Response (200 OK)**:
  ```json
  {
    "total_products": 45,
    "total_received": 12500,
    "total_units": 4200,
    "units_in_transit": 800,
    "units_sold": 7500,
    "in_stock": 38,
    "low_stock": 5,
    "out_of_stock": 2
  }
  ```

### 8.10 سجل حركة مخزون منتج محدد (Product Inventory Movements Ledger)
* **Endpoint**: `GET /reports/inventory-movements/{productId}`
* **Response (200 OK)**:
  ```json
  {
    "product": {
      "id": "prod-101",
      "label": "ساعة يد كلاسيكية",
      "current_stock": 140,
      "total_stock": 500,
      "units_in_transit": 30,
      "units_sold": 330,
      "warning_stock_number": 20
    },
    "data": [
      {
        "date": "2025-01-01",
        "type": "inbound",
        "type_label": "توريد مخزن",
        "quantity": 500,
        "balance": 500,
        "reference": "PO-991"
      },
      {
        "date": "2025-01-10",
        "type": "outbound_shipment",
        "type_label": "شحن طلبية",
        "quantity": -2,
        "balance": 498,
        "reference": "EGY1000010"
      },
      {
        "date": "2025-01-15",
        "type": "return_in",
        "type_label": "مرتجع للمخزن",
        "quantity": 1,
        "balance": 499,
        "reference": "EGY1000008"
      }
    ]
  }
  ```

### 8.11 تصدير وتفاصيل جميع الطلبات للفترة (Orders Detail & Export)
* **Endpoint**: `GET /reports/orders`
* **Query Parameters**: `from`, `to`, `page`, `limit`, `status`, `search`
* **Response (200 OK)**:
  ```json
  {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "data": [
      {
        "id": 1001,
        "order_code": "EGY1000100",
        "date": "2025-01-14T10:31:23.000000Z",
        "customer_name": "أحمد علي",
        "customer_phone": "01012345678",
        "city": "القاهرة",
        "area": "مدينة نصر",
        "store": "Online Store",
        "carrier": "سريع إكسبرس",
        "items_count": 2,
        "status": "delivered",
        "status_code": "9",
        "goods_total": 500,
        "shipping_cost": 60,
        "total": 560
      }
    ]
  }
  ```
