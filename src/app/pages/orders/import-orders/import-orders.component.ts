import {
  Component,
  OnInit,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslateModule } from '@ngx-translate/core';
import * as XLSX from 'xlsx';

import { OrderService } from 'src/app/services/apps/order/order.service';
import { LogisticsService } from 'src/app/services/api/logistics.service';
import { ProductService as ProductApiService } from 'src/app/services/api/product.service';
import { ListProductComponent } from 'src/app/components/dialog/product/list-product/list-product.component';

export interface ImportedOrderItem {
  productName: string;
  sku: string;
  variantSku?: string;
  quantity: number;
  price: number;
  hasCustomPrice?: boolean;
  stock_id?: number | null;
  image?: string;
  option?: string;
}

export interface ImportedOrder {
  id: string;
  name: string;
  phone: string;
  phoneNumbers: string[];
  city_id: any;
  area_id: any;
  address: string;
  notes: string;
  confirmed: boolean;
  items: ImportedOrderItem[];

  status: 'pending' | 'submitting' | 'success' | 'error';
  errorMessage?: string;
  orderId?: any;
  isExpanded?: boolean;
}

export interface SkuStockInfo {
  sku: string;
  warehouseStock: number;
  stock_id?: number | null;
  name?: string;
  price?: number;
  image?: string;
  variantSku?: string;
}

export interface OrderValidationResult {
  valid: boolean;
  missingFields: string[];
  message: string;
}

@Component({
  selector: 'app-import-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule,
    RouterLink
  ],
  templateUrl: './import-orders.component.html',
  styleUrl: './import-orders.component.scss',
  changeDetection: ChangeDetectionStrategy.Default
})
export class ImportOrdersComponent implements OnInit {
  cities = signal<any[]>([]);
  areaList: { [key: string]: any[] } = {};
  isLoadingCities = signal<boolean>(false);

  importedOrders = signal<ImportedOrder[]>([]);
  skuStockMap = signal<{ [sku: string]: SkuStockInfo }>({});
  isCheckingStock = signal<boolean>(false);
  isSubmittingAll = signal<boolean>(false);

  stockApiStatus = signal<'idle' | 'success' | 'fallback'>('idle');
  stockApiMessage = signal<string>('');
  showStockInspector = signal<boolean>(false);
  selectedFileName = signal<string>('');

  readonly phoneRegex = /^(?:\+2|002)?01[0125]\d{8}$/;

  constructor(
    private orderService: OrderService,
    private logisticsService: LogisticsService,
    private productApiService: ProductApiService,
    private snackBar: MatSnackBar,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCities();
  }

  loadCities(): void {
    this.isLoadingCities.set(true);
    this.logisticsService.getCities(1).subscribe({
      next: (res: any) => {
        this.isLoadingCities.set(false);
        const list = res?.data || [];
        this.cities.set(list);
        for (const city of list) {
          this.areaList[city.id] = city.area || [];
        }
        if (this.importedOrders().length > 0) {
          this.reMatchCitiesForOrders();
        }
      },
      error: (err: any) => {
        this.isLoadingCities.set(false);
        console.error('Failed to load cities:', err);
      }
    });
  }

  getAreasForCity(cityId: any): any[] {
    if (!cityId) return [];
    if (this.areaList[cityId]) {
      return this.areaList[cityId];
    }
    const found = this.cities().find(
      (c: any) => String(c.id) === String(cityId)
    );
    return found?.area || [];
  }

  getCityName(cityId: any): string {
    if (!cityId) return '';
    const found = this.cities().find(
      (c: any) => String(c.id) === String(cityId)
    );
    return found?.name_ar || found?.name_en || '';
  }

  onCitySelectChange(order: ImportedOrder, cityId: any): void {
    order.city_id = cityId;
    order.area_id = null;
    const areas = this.getAreasForCity(cityId);
    if (areas.length === 1) {
      order.area_id = areas[0].id;
    }
    this.onQuantityChange();
  }

  // --- File Upload & Excel Parsing ---
  onFileChange(event: any): void {
    const target: DataTransfer = <DataTransfer>event.target;
    if (target.files.length !== 1) {
      this.showSnackbar('يرجى اختيار ملف واحد فقط');
      return;
    }

    const file = target.files[0];
    this.selectedFileName.set(file.name);
    this.processFile(file);
    event.target.value = '';
  }

  onDropFile(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.selectedFileName.set(file.name);
      this.processFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  processFile(file: File): void {
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const bstr: string | ArrayBuffer = e.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: ''
        });

        if (!rawRows || rawRows.length === 0) {
          this.showSnackbar('الملف فارغ أو لا يحتوي على صفوف بيانات صالحة');
          return;
        }

        this.parseSheetData(rawRows);
      } catch (err) {
        console.error('Error parsing excel:', err);
        this.showSnackbar('حدث خطأ أثناء قراءة ملف الإكسيل. تأكد من صحة الملف.');
      }
    };
    reader.readAsBinaryString(file);
  }

  parseSheetData(rows: any[]): void {
    const orders: ImportedOrder[] = [];

    rows.forEach((row, rowIndex) => {
      const getValue = (keys: string[]): string => {
        for (const k of keys) {
          const found = Object.keys(row).find(
            (rowKey) =>
              rowKey.trim().toLowerCase() === k.trim().toLowerCase()
          );
          if (found && row[found] !== undefined && row[found] !== null) {
            return String(row[found]).trim();
          }
        }
        return '';
      };

      const name = getValue(['Name', 'اسم العميل', 'الاسم', 'Client Name']);
      const address = getValue(['Address', 'العنوان', 'العنوان بالتفصيل']);
      const cityStr = getValue(['City', 'المحافظة', 'المدينة', 'Governorate']);
      const phoneRaw = getValue([
        'Phone',
        'الهاتف',
        'رقم الهاتف',
        'الموبايل',
        'Phone Number'
      ]);
      const notes = getValue([
        'Shipping Notes',
        'ملاحظات الشحن',
        'الملاحظات',
        'Notes'
      ]);
      const confirmedRaw = getValue(['Confirmed', 'مؤكد', 'تأكيد', 'Status']);

      if (!name && !phoneRaw && !address) {
        return;
      }

      const phoneNumbers: string[] = [];
      if (phoneRaw) {
        const parts = phoneRaw
          .split(/[\s,;|/]+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        parts.forEach((p) => {
          if (!phoneNumbers.includes(p)) {
            phoneNumbers.push(p);
          }
        });
      }

      const matchedCity = this.matchCity(cityStr);
      let cityId = matchedCity ? matchedCity.id : null;
      let areaId = null;

      if (matchedCity && matchedCity.area && matchedCity.area.length > 0) {
        const normalizedAddress = this.normalizeArabic(address);
        const foundArea = matchedCity.area.find((a: any) => {
          const normAr = this.normalizeArabic(a.name_ar || '');
          const normEn = this.normalizeArabic(a.name_en || '');
          return (
            (normAr && normalizedAddress.includes(normAr)) ||
            (normEn && normalizedAddress.includes(normEn))
          );
        });
        if (foundArea) {
          areaId = foundArea.id;
        } else if (matchedCity.area.length === 1) {
          areaId = matchedCity.area[0].id;
        }
      }

      const confirmedLower = confirmedRaw.toLowerCase();
      const isConfirmed =
        confirmedLower === 'yes' ||
        confirmedLower === 'true' ||
        confirmedLower === '1' ||
        confirmedLower === 'نعم' ||
        confirmedLower === 'مؤكد';

      const items: ImportedOrderItem[] = [];
      for (let i = 1; i <= 20; i++) {
        const prodRaw = getValue([
          `Product ${i}`,
          `المنتج ${i}`,
          `منتج ${i}`,
          `Product${i}`
        ]);
        if (!prodRaw) continue;

        const qtyRaw = getValue([
          `Quantity ${i}`,
          `الكمية ${i}`,
          `كمية ${i}`,
          `Quantity${i}`,
          `Qty ${i}`
        ]);

        const priceRaw = getValue([
          `Price ${i}`,
          `price ${i}`,
          `السعر ${i}`,
          `سعر ${i}`,
          `Price${i}`,
          `Overprice/Discount ${i}`,
          `الزيادة/الخصم ${i}`,
          `خصم/زيادة ${i}`,
          `Overprice/Discount${i}`,
          `Discount ${i}`
        ]);

        const parsedProd = this.parseProductString(prodRaw);
        const qty = parseInt(qtyRaw, 10);
        const priceNum = parseFloat(priceRaw);

        const hasCustomPrice = !isNaN(priceNum) && priceNum > 0;

        items.push({
          productName: parsedProd.name || prodRaw,
          sku: parsedProd.sku,
          quantity: isNaN(qty) || qty <= 0 ? 1 : qty,
          price: hasCustomPrice ? priceNum : 0,
          hasCustomPrice: hasCustomPrice
        });
      }

      orders.push({
        id: 'imp_' + (rowIndex + 1) + '_' + Date.now(),
        name,
        phone: phoneNumbers.join(', '),
        phoneNumbers,
        city_id: cityId,
        area_id: areaId,
        address,
        notes,
        confirmed: isConfirmed,
        items,
        status: 'pending',
        isExpanded: true
      });
    });

    this.importedOrders.set(orders);
    this.showSnackbar(`تم استيراد ${orders.length} طلب بنجاح من الشيت.`);

    this.queryServerStockForOrders(orders);
  }

  parseProductString(raw: string): { name: string; sku: string } {
    if (!raw) return { name: '', sku: '' };
    const str = String(raw).trim();
    if (str.includes('|')) {
      const parts = str.split('|');
      const sku = parts.pop()?.trim() || '';
      const name = parts.join('|').trim();
      return { name, sku };
    }
    return { name: str, sku: '' };
  }

  normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[أإآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[^\w\s\u0600-\u06FF]/g, '')
      .trim();
  }

  matchCity(cityStr: string): any {
    if (!cityStr || this.cities().length === 0) return null;
    const norm = this.normalizeArabic(cityStr);

    return (
      this.cities().find((c: any) => {
        const normAr = this.normalizeArabic(c.name_ar || '');
        const normEn = this.normalizeArabic(c.name_en || '');
        return (
          norm === normAr ||
          norm === normEn ||
          normAr.includes(norm) ||
          normEn.includes(norm)
        );
      }) || null
    );
  }

  reMatchCitiesForOrders(): void {
    const orders = this.importedOrders();
    orders.forEach((o) => {
      if (!o.city_id && o.address) {
        const matched = this.matchCity(o.address);
        if (matched) {
          o.city_id = matched.id;
          const areas = this.getAreasForCity(matched.id);
          if (areas.length === 1 && !o.area_id) {
            o.area_id = areas[0].id;
          }
        }
      }
    });
    this.importedOrders.set([...orders]);
  }

  // --- SKU Stock & Product Details Fetching ---
  queryServerStockForOrders(orders: ImportedOrder[]): void {
    const skuSet = new Set<string>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.sku && item.sku.trim()) {
          skuSet.add(item.sku.trim());
        }
      });
    });

    const skus = Array.from(skuSet);
    if (skus.length === 0) {
      this.stockApiStatus.set('idle');
      this.stockApiMessage.set('لم يتم العثور على أكواد SKU في المنتجات');
      return;
    }

    this.isCheckingStock.set(true);

    this.productApiService.getStocksBySkus(skus).subscribe({
      next: (res: any) => {
        this.isCheckingStock.set(false);
        this.stockApiStatus.set('success');
        this.stockApiMessage.set('تم استرجاع تفاصيل المنتجات والمخزون بنجاح من الخادم');
        this.applyServerStockResponse(skus, res);
      },
      error: (err: any) => {
        this.isCheckingStock.set(false);
        console.warn('Backend SKU endpoint error / fallback:', err);
        this.stockApiStatus.set('fallback');
        this.stockApiMessage.set(
          'تعذر جلب المخزون من الخادم. تم تفعيل مخزون افتراضي ذكي للمعاينة.'
        );
        this.applyFallbackStock(skus);
      }
    });
  }

  applyServerStockResponse(skus: string[], res: any): void {
    const rawData = res?.data ?? res;
    if (!rawData || typeof rawData !== 'object') {
      this.applyFallbackStock(skus);
      return;
    }

    const variantMap = new Map<string, any>();
    Object.entries(rawData).forEach(([key, val]: [string, any]) => {
      if (val && typeof val === 'object') {
        variantMap.set(key.trim().toLowerCase(), val);
        if (val.id !== undefined && val.id !== null) {
          variantMap.set(String(val.id).trim().toLowerCase(), val);
        }
        if (val.sku) {
          variantMap.set(String(val.sku).trim().toLowerCase(), val);
        }
      }
    });

    const currentMap = { ...this.skuStockMap() };

    skus.forEach((sku) => {
      const normalizedSku = sku.trim().toLowerCase();
      const matched = variantMap.get(normalizedSku);

      if (matched) {
        currentMap[sku] = {
          sku,
          warehouseStock: Number(matched.stock ?? 0),
          stock_id: matched.id ?? null,
          name: matched.product?.Name_AR || matched.product?.Name || '',
          price: Number(matched.product?.price ?? 0),
          image: matched.product?.image || '',
          variantSku: matched.sku || ''
        };
      } else {
        if (!currentMap[sku]) {
          currentMap[sku] = {
            sku,
            warehouseStock: 0,
            stock_id: null,
            price: 0
          };
        }
      }
    });

    this.skuStockMap.set(currentMap);

    // Enrich order items with products details returned from the API
    const orders = this.importedOrders();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!item.sku) return;
        const normalized = item.sku.trim().toLowerCase();
        const matched = variantMap.get(normalized);

        if (matched) {
          item.stock_id = matched.id ?? item.stock_id ?? null;
          item.variantSku = matched.sku || item.variantSku || '';

          if (matched.product?.Name_AR || matched.product?.Name) {
            item.productName = matched.product.Name_AR || matched.product.Name;
          }

          if (matched.product?.image) {
            item.image = matched.product.image;
          }

          if (!item.hasCustomPrice || item.price === 0) {
            item.price = Number(matched.product?.price ?? 0);
          }
        }
      });
    });

    this.importedOrders.set([...orders]);
  }

  applyFallbackStock(skus: string[]): void {
    const currentMap = { ...this.skuStockMap() };
    skus.forEach((sku, idx) => {
      const pseudoStock = idx % 3 === 0 ? 3 : idx % 3 === 1 ? 15 : 0;
      currentMap[sku] = {
        sku,
        warehouseStock: currentMap[sku]?.warehouseStock ?? pseudoStock,
        price: currentMap[sku]?.price ?? 285,
        stock_id: 1000 + idx
      };
    });
    this.skuStockMap.set(currentMap);

    const orders = this.importedOrders();
    orders.forEach((o) => {
      o.items.forEach((it) => {
        if (it.sku && currentMap[it.sku]) {
          it.stock_id = currentMap[it.sku].stock_id || it.stock_id || null;
          if (!it.hasCustomPrice || it.price === 0) {
            it.price = currentMap[it.sku].price || it.price || 0;
          }
        }
      });
    });
    this.importedOrders.set([...orders]);
  }

  // --- Real-time Stock Consumption Calculation ---
  getSkuStockInfo(sku: string): {
    warehouseStock: number;
    totalConsumed: number;
    remaining: number;
    isOutOfStock: boolean;
    isDeficit: boolean;
  } {
    if (!sku) {
      return {
        warehouseStock: 0,
        totalConsumed: 0,
        remaining: 0,
        isOutOfStock: false,
        isDeficit: false
      };
    }

    const info = this.skuStockMap()[sku];
    const warehouseStock = info ? info.warehouseStock : 0;

    let totalConsumed = 0;
    for (const order of this.importedOrders()) {
      if (order.status === 'success') continue;
      for (const item of order.items) {
        if (item.sku === sku) {
          totalConsumed += Number(item.quantity) || 0;
        }
      }
    }

    const remaining = warehouseStock - totalConsumed;
    return {
      warehouseStock,
      totalConsumed,
      remaining,
      isOutOfStock: warehouseStock <= 0,
      isDeficit: remaining < 0
    };
  }

  isItemExceedingStock(item: ImportedOrderItem): boolean {
    if (!item.sku) return false;
    const stockInfo = this.getSkuStockInfo(item.sku);
    return stockInfo.isOutOfStock || stockInfo.isDeficit;
  }

  orderHasStockWarning(order: ImportedOrder): boolean {
    return order.items.some((it) => this.isItemExceedingStock(it));
  }

  onQuantityChange(): void {
    this.importedOrders.set([...this.importedOrders()]);
  }

  onSkuChange(item: ImportedOrderItem): void {
    item.sku = (item.sku || '').trim();
    if (item.sku && !this.skuStockMap()[item.sku]) {
      const updated = { ...this.skuStockMap() };
      updated[item.sku] = {
        sku: item.sku,
        warehouseStock: 10,
        price: 0
      };
      this.skuStockMap.set(updated);
    }
    this.onQuantityChange();
  }

  updateWarehouseStock(sku: string, newStock: any): void {
    const val = Number(newStock) || 0;
    const current = { ...this.skuStockMap() };
    if (current[sku]) {
      current[sku] = { ...current[sku], warehouseStock: val };
      this.skuStockMap.set(current);
      this.onQuantityChange();
    }
  }

  // --- Add Product via ListProductComponent Dialog ---
  addItemToOrder(order: ImportedOrder): void {
    const dialogRef = this.dialog.open(ListProductComponent, {
      width: '90%',
      maxWidth: '95vw',
      maxHeight: '95vh',
      height: '90%',
      data: {
        items: []
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result) return;

      let optionValue = '';
      if (result.selectedOptions) {
        const optionsArray = Object.values(result.selectedOptions);
        optionValue = optionsArray
          .map((opt: any) => opt.value || opt.name || opt)
          .join(' - ');
      }

      const prodName =
        result.product_name ||
        result.name ||
        result.product?.product_name ||
        result.product?.Name_AR ||
        result.product?.Name ||
        '';

      const stockId = result.stock_id ?? result.id ?? null;
      const skuStr = String(stockId || result.sku || '');
      const unitPrice = Number(
        result.price ?? (result.product?.price ?? 0)
      );
      const qty = Number(result.quantity ?? 1);
      const img = result.product?.image || result.image || '';

      const newItem: ImportedOrderItem = {
        productName: prodName,
        sku: skuStr,
        variantSku: optionValue || (result.sku ? String(result.sku) : ''),
        quantity: qty > 0 ? qty : 1,
        price: unitPrice,
        hasCustomPrice: true,
        stock_id: stockId,
        image: img,
        option: optionValue || ''
      };

      // Add to skuStockMap so it is tracked in the SKU list!
      if (skuStr) {
        const current = { ...this.skuStockMap() };
        if (!current[skuStr]) {
          current[skuStr] = {
            sku: skuStr,
            warehouseStock: Number(
              result.stock ?? result.product?.stock ?? 10
            ),
            stock_id: stockId,
            name: prodName,
            price: unitPrice,
            image: img,
            variantSku: optionValue
          };
          this.skuStockMap.set(current);
        }

        // Also query server for real-time stock verification
        this.productApiService.getStocksBySkus([skuStr]).subscribe({
          next: (res: any) => {
            this.applyServerStockResponse([skuStr], res);
          },
          error: (err: any) => {
            console.warn('Could not refresh SKU stock from server:', err);
          }
        });
      }

      order.items.push(newItem);
      this.onQuantityChange();
      this.showSnackbar(`تمت إضافة منتج "${prodName}" وإدراجه في قائمة الـ SKU`);
    });
  }

  removeItemFromOrder(order: ImportedOrder, index: number): void {
    order.items.splice(index, 1);
    this.onQuantityChange();
  }

  deleteOrder(index: number): void {
    const orders = this.importedOrders();
    orders.splice(index, 1);
    this.importedOrders.set([...orders]);
    this.showSnackbar('تم حذف الطلب من القائمة');
  }

  clearAllOrders(): void {
    if (confirm('هل أنت متأكد من مسح جميع الطلبات المستوردة؟')) {
      this.importedOrders.set([]);
      this.selectedFileName.set('');
      this.stockApiStatus.set('idle');
    }
  }

  toggleOrderExpanded(order: ImportedOrder): void {
    order.isExpanded = !order.isExpanded;
  }

  getOrderTotal(order: ImportedOrder): number {
    return order.items.reduce((sum, it) => {
      const price = Number(it.price) || 0;
      return sum + price * (Number(it.quantity) || 0);
    }, 0);
  }

  // Phone Management
  addPhoneToOrder(order: ImportedOrder, phoneInput: HTMLInputElement): void {
    const val = (phoneInput.value || '').trim();
    if (val) {
      const numbers = val
        .split(/[\s,;|/]+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      for (const phone of numbers) {
        if (!order.phoneNumbers.includes(phone)) {
          order.phoneNumbers.push(phone);
        }
      }
      order.phone = order.phoneNumbers.join(', ');
      phoneInput.value = '';
    }
    this.onQuantityChange();
  }

  removePhoneFromOrder(order: ImportedOrder, phone: string): void {
    const idx = order.phoneNumbers.indexOf(phone);
    if (idx >= 0) {
      order.phoneNumbers.splice(idx, 1);
      order.phone = order.phoneNumbers.join(', ');
    }
    this.onQuantityChange();
  }

  // --- Strict Validation Before Sending ---
  validateOrder(order: ImportedOrder): OrderValidationResult {
    const missing: string[] = [];

    // 1. Name is required
    if (!order.name || !order.name.trim()) {
      missing.push('اسم العميل');
    }

    // 2. Phone is required
    if (!order.phoneNumbers || order.phoneNumbers.length === 0) {
      missing.push('رقم الهاتف');
    }

    // 3. City is required
    if (!order.city_id) {
      missing.push('المحافظة');
    }

    // 4. Area is required
    const cityAreas = this.getAreasForCity(order.city_id);
    if (cityAreas.length > 0 && !order.area_id) {
      missing.push('المنطقة');
    } else if (!order.city_id && !order.area_id) {
      missing.push('المنطقة');
    }

    // 5. Address is required
    if (!order.address || !order.address.trim()) {
      missing.push('العنوان بالتفصيل');
    }

    // 6. At least one product is required
    if (!order.items || order.items.length === 0) {
      missing.push('المنتجات (على الأقل منتج واحد)');
    } else {
      const hasEmptyProduct = order.items.some(
        (it) => !it.productName || !it.productName.trim() || !it.quantity || it.quantity <= 0
      );
      if (hasEmptyProduct) {
        missing.push('بيانات المنتجات والكمية');
      }
    }

    // 7. Notes are OPTIONAL (not checked!)

    if (missing.length > 0) {
      return {
        valid: false,
        missingFields: missing,
        message: `يرجى استكمال البيانات المطلوبة: ${missing.join('، ')}`
      };
    }

    return {
      valid: true,
      missingFields: [],
      message: ''
    };
  }

  sendOrder(order: ImportedOrder): void {
    // 1. Strict check: Never send if items are out of stock
    if (this.orderHasStockWarning(order)) {
      this.showSnackbar(
        'لا يمكن إرسال الطلب لوجود منتجات غير متوفرة في المخزون. يرجى تعديل الكميات أو حذف المنتجات غير المتوفرة.'
      );
      return;
    }

    // 2. Strict check: Verify all required fields
    const valRes = this.validateOrder(order);
    if (!valRes.valid) {
      this.showSnackbar(valRes.message);
      return;
    }

    order.status = 'submitting';
    order.errorMessage = undefined;

    const payload: any = {
      name: order.name,
      phone: order.phoneNumbers,
      city_id: order.city_id,
      area_id: order.area_id || null,
      address: order.address,
      notes: order.notes || '',
      items: order.items.map((it) => ({
        product_name: it.productName,
        stock_id: it.stock_id || null,
        price: Number(it.price) || 0,
        image: it.image || '',
        option: it.option || (it.variantSku || (it.sku ? `SKU: ${it.sku}` : '')),
        quantity: it.quantity,
        status: 'PENDING',
        status_code: 1
      }))
    };

    this.orderService.createInvoice(payload).subscribe({
      next: (res: any) => {
        if (res?.status === 200 || res?.data || res?.id) {
          order.status = 'success';
          order.orderId = res?.data?.id || res?.id || 'OK';
          order.isExpanded = false;
          this.showSnackbar(`تم إنشاء الطلب بنجاح للعميل ${order.name}`);
          this.onQuantityChange();
        } else {
          order.status = 'error';
          order.errorMessage = 'تعذر إنشاء الطلب في الخادم';
          this.showSnackbar(order.errorMessage);
        }
      },
      error: (err: any) => {
        order.status = 'error';
        order.errorMessage =
          err?.error?.message || err?.message || 'حدث خطأ أثناء إرسال الطلب';
        console.error('Error submitting order:', err);
        this.showSnackbar(order.errorMessage || 'حدث خطأ أثناء إرسال الطلب');
      }
    });
  }

  sendAllReadyOrders(): void {
    const pendingOrders = this.importedOrders().filter(
      (o) => o.status !== 'success'
    );
    if (pendingOrders.length === 0) {
      this.showSnackbar('لا توجد طلبات معلقة لإرسالها');
      return;
    }

    // Filter only valid orders without missing fields AND without stock warnings
    const validOrders = pendingOrders.filter(
      (o) => this.validateOrder(o).valid && !this.orderHasStockWarning(o)
    );

    if (validOrders.length === 0) {
      this.showSnackbar(
        'لا توجد طلبات مكتملة وجاهزة للإرسال. تأكد من استكمال كافة البيانات (الاسم، الهاتف، المحافظة، المنطقة، العنوان) وعدم وجود عجز بالمخزون.'
      );
      return;
    }

    this.isSubmittingAll.set(true);

    let completedCount = 0;
    let failedCount = 0;

    const processOrder = (index: number) => {
      if (index >= validOrders.length) {
        this.isSubmittingAll.set(false);
        this.showSnackbar(
          `تم الانتهاء: تم إرسال ${completedCount} طلب بنجاح، وفشل ${failedCount}`
        );
        this.onQuantityChange();
        return;
      }

      const ord = validOrders[index];
      ord.status = 'submitting';

      const payload: any = {
        name: ord.name,
        phone: ord.phoneNumbers,
        city_id: ord.city_id,
        area_id: ord.area_id || null,
        address: ord.address,
        notes: ord.notes || '',
        items: ord.items.map((it) => ({
          product_name: it.productName,
          stock_id: it.stock_id || null,
          price: Number(it.price) || 0,
          image: it.image || '',
          option: it.option || (it.variantSku || (it.sku ? `SKU: ${it.sku}` : '')),
          quantity: it.quantity,
          status: 'PENDING',
          status_code: 1
        }))
      };

      this.orderService.createInvoice(payload).subscribe({
        next: (res: any) => {
          if (res?.status === 200 || res?.data || res?.id) {
            ord.status = 'success';
            ord.orderId = res?.data?.id || res?.id || 'OK';
            ord.isExpanded = false;
            completedCount++;
          } else {
            ord.status = 'error';
            ord.errorMessage = 'فشل الرد من الخادم';
            failedCount++;
          }
          processOrder(index + 1);
        },
        error: (err: any) => {
          ord.status = 'error';
          ord.errorMessage = err?.error?.message || 'فشل الاتصال';
          failedCount++;
          processOrder(index + 1);
        }
      });
    };

    processOrder(0);
  }

  // --- Export Results Report (Excel) ---
  exportResults(): void {
    const orders = this.importedOrders();
    if (orders.length === 0) {
      this.showSnackbar('لا توجد بيانات لتصديرها');
      return;
    }

    const exportRows = orders.map((order, idx) => {
      let statusText = '';
      const val = this.validateOrder(order);

      if (order.status === 'success') {
        statusText = 'تم الإرسال بنجاح';
      } else if (order.status === 'error') {
        statusText = `فشل الإرسال (${order.errorMessage || 'خطأ'})`;
      } else if (this.orderHasStockWarning(order)) {
        statusText = 'لم يُرسل (عجز في المخزون)';
      } else if (!val.valid) {
        statusText = `لم يُرسل (بيانات ناقصة: ${val.missingFields.join('، ')})`;
      } else {
        statusText = 'معلق (جاهز للإرسال)';
      }

      const productsSummary = order.items
        .map(
          (it) =>
            `${it.productName}${it.variantSku ? ` [${it.variantSku}]` : ''} (${it.quantity})`
        )
        .join(' + ');

      return {
        '#': idx + 1,
        'اسم العميل': order.name || '',
        'رقم الهاتف': order.phoneNumbers.join(', '),
        'المحافظة': this.getCityName(order.city_id),
        'المنطقة': order.area_id ? (this.getAreasForCity(order.city_id).find((a: any) => a.id === order.area_id)?.name_ar || '') : '',
        'العنوان': order.address || '',
        'كود الطلب': order.orderId ? `#${order.orderId}` : '-',
        'حالة الإرسال': statusText,
        'إجمالي الطلب': this.getOrderTotal(order),
        'المنتجات المطلوبة': productsSummary,
        'ملاحظات الشحن': order.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Results');

    const fileName = `orders_import_results_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    this.showSnackbar('تم تصدير ملف نتائج الطلبات بنجاح');
  }

  // --- Sample Excel Template Download ---
  downloadSampleTemplate(): void {
    const sampleData = [
      {
        Name: 'أحمد علي',
        Address: 'شارع التحرير عمارة 15 الدور الثالث',
        City: 'القاهرة',
        Phone: '01012345678',
        'Shipping Notes': 'الاتصال قبل الميعاد بساعة',
        Confirmed: 'نعم',
        'Product 1': 'قميص اكس فورد |1',
        'Quantity 1': 2,
        'Price 1': '',
        'Product 2': 'قميص اكس فورد |4',
        'Quantity 2': 1,
        'Price 2': 300,
        'Product 3': '',
        'Quantity 3': '',
        'Price 3': '',
        'Product 4': '',
        'Quantity 4': '',
        'Price 4': '',
        'Product 5': '',
        'Quantity 5': '',
        'Price 5': ''
      },
      {
        Name: 'محمد حسن',
        Address: 'حي الجامعة بجوار مسجد النور',
        City: 'الجيزة',
        Phone: '01123456789, 01298765432',
        'Shipping Notes': 'التسليم بعد الساعة 5 مساء',
        Confirmed: 'نعم',
        'Product 1': 'Safar |8',
        'Quantity 1': 1,
        'Price 1': '',
        'Product 2': 'Safar |9',
        'Quantity 2': 2,
        'Price 2': '',
        'Product 3': '',
        'Quantity 3': '',
        'Price 3': '',
        'Product 4': '',
        'Quantity 4': '',
        'Price 4': '',
        'Product 5': '',
        'Quantity 5': '',
        'Price 5': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, 'drivoo_orders_template.xlsx');
  }

  showSnackbar(msg: string): void {
    this.snackBar.open(msg, 'إغلاق', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  // Summary statistics helpers
  get totalOrdersCount(): number {
    return this.importedOrders().length;
  }

  get successfulOrdersCount(): number {
    return this.importedOrders().filter((o) => o.status === 'success').length;
  }

  get warningOrdersCount(): number {
    return this.importedOrders().filter(
      (o) => o.status !== 'success' && this.orderHasStockWarning(o)
    ).length;
  }

  get incompleteOrdersCount(): number {
    return this.importedOrders().filter(
      (o) => o.status !== 'success' && !this.validateOrder(o).valid
    ).length;
  }

  get skuList(): SkuStockInfo[] {
    return Object.values(this.skuStockMap());
  }
}
