import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslateModule } from '@ngx-translate/core';

import { ProductService as ProductApiService } from 'src/app/services/api/product.service';
import { StockRequestService } from 'src/app/services/api/stock-request.service';

export interface StockItemForm {
  id: number;
  stockId: number;
  sku: string;
  path: number[];
  option_name: string;
  current_stock: number;
  quantity_to_add: number;
  notes?: string;
}

@Component({
  selector: 'app-create-stock-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule,
    RouterModule
  ],
  templateUrl: './create-stock-request.component.html',
  styleUrl: './create-stock-request.component.scss'
})
export class CreateStockRequestComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private productApiService = inject(ProductApiService);
  private stockRequestService = inject(StockRequestService);

  productId = signal<number | null>(null);
  product = signal<any | null>(null);
  optionsObject = signal<Record<string, any>>({});
  optionsList = signal<any[]>([]);
  stockItems = signal<StockItemForm[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  searchQuery = signal<string>('');
  bulkQuantity = signal<number | null>(null);

  // General request metadata
  depot_id: number = 1;
  depot_name: string = 'المخزن الرئيسي - القاهرة';
  supplier_name: string = '';
  invoice_ref: string = '';
  notes: string = '';

  depots = [
    { id: 1, name: 'المخزن الرئيسي - القاهرة' },
    // { id: 2, name: 'مخزن العبور المركزي' },
    // { id: 3, name: 'مخزن الإسكندرية' },
    // { id: 4, name: 'مخزن الجيزة' }
  ];

  filteredStockItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const items = this.stockItems();
    if (!q) return items;
    return items.filter(it =>
      it.sku.toLowerCase().includes(q) ||
      it.option_name.toLowerCase().includes(q)
    );
  });

  totalQuantityToAdd = computed(() => {
    return this.stockItems().reduce((sum, it) => sum + (Number(it.quantity_to_add) || 0), 0);
  });

  totalSkusSelected = computed(() => {
    return this.stockItems().filter(it => (Number(it.quantity_to_add) || 0) > 0).length;
  });

  ngOnInit(): void {
    // Requires a product id in route param :id
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      const numericId = idParam ? Number(idParam) : null;

      if (!numericId || isNaN(numericId)) {
        this.snackBar.open('يرجى اختيار منتج أولاً لإضافة وتوريد المخزون', 'إغلاق', { duration: 4000 });
        this.router.navigate(['/products']);
        return;
      }

      this.productId.set(numericId);
      this.loadProductDetails(numericId);
    });
  }

  loadProductDetails(id: number): void {
    this.isLoading.set(true);
    this.productApiService.getProductById(id).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        this.processProductData(data, id);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.warn('getProductById failed or not yet available, falling back to mock product template:', err);
        // const mockData = this.getMockProductData(id);
        // this.processProductData(mockData, id);
        this.isLoading.set(false);
      }
    });
  }

  private processProductData(data: any, id: number): void {
    const prod = data?.product || data;
    this.product.set(prod);

    const optionsObj = data?.options_object || {};
    this.optionsObject.set(optionsObj);

    const options = data?.options || [];
    this.optionsList.set(options);

    const stocks = data?.stocks || [];

    if (Array.isArray(stocks) && stocks.length > 0) {
      const mapped = stocks.map((st: any) => {
        const optionName = this.formatOptionName(st.path, optionsObj, st.sku);
        return {
          id: st.id,
          stockId: st.id,
          sku: st.sku,
          path: st.path || [],
          option_name: optionName,
          current_stock: Number(st.stock) || 0,
          quantity_to_add: 0,
          notes: ''
        };
      });
      this.stockItems.set(mapped);
    } else {
      // Default single stock row if no variants
      this.stockItems.set([
        {
          id: 1,
          stockId: 1,
          sku: `${id} - default`,
          path: [],
          option_name: 'افتراضي (Default)',
          current_stock: Number(prod?.stock) || 0,
          quantity_to_add: 0,
          notes: ''
        }
      ]);
    }
  }

  /**
   * Formats the human-readable option name based on path IDs and options_object dictionary.
   * e.g. path: [4, 5] -> "احمر - XL"
   */
  formatOptionName(path: number[], optionsObj: Record<string, any>, sku: string): string {
    if (Array.isArray(path) && path.length > 0 && optionsObj && Object.keys(optionsObj).length > 0) {
      const parts = path
        .map(optId => {
          const opt = optionsObj[optId] || optionsObj[String(optId)];
          return opt?.value || null;
        })
        .filter(Boolean);

      if (parts.length > 0) {
        return parts.join(' - ');
      }
    }

    // Secondary fallback: Extract clean option name from SKU (e.g. "5 - اسود - XL" -> "اسود - XL")
    if (sku) {
      const segments = sku.split('-').map(s => s.trim());
      if (segments.length > 1) {
        return segments.slice(1).join(' - ');
      }
      return sku;
    }

    return 'افتراضي (Default)';
  }

  incrementQty(item: StockItemForm, step: number = 1): void {
    item.quantity_to_add = (Number(item.quantity_to_add) || 0) + step;
    this.updateStockItem(item);
  }

  decrementQty(item: StockItemForm, step: number = 1): void {
    const current = Number(item.quantity_to_add) || 0;
    item.quantity_to_add = Math.max(0, current - step);
    this.updateStockItem(item);
  }

  addFixedQty(item: StockItemForm, amount: number): void {
    item.quantity_to_add = (Number(item.quantity_to_add) || 0) + amount;
    this.updateStockItem(item);
  }

  onQtyChange(item: StockItemForm): void {
    if (item.quantity_to_add < 0 || isNaN(item.quantity_to_add)) {
      item.quantity_to_add = 0;
    }
    this.updateStockItem(item);
  }

  private updateStockItem(item: StockItemForm): void {
    const list = [...this.stockItems()];
    const index = list.findIndex(i => i.id === item.id);
    if (index > -1) {
      list[index] = { ...item };
      this.stockItems.set(list);
    }
  }

  applyBulkQuantity(): void {
    const val = this.bulkQuantity();
    if (val === null || val === undefined || val < 0) return;

    const list = this.stockItems().map(item => ({
      ...item,
      quantity_to_add: val
    }));
    this.stockItems.set(list);
    this.snackBar.open(`تم تطبيق ${val} قطعة على جميع الخيارات`, 'إغلاق', { duration: 2500 });
  }

  resetAllQuantities(): void {
    const list = this.stockItems().map(item => ({
      ...item,
      quantity_to_add: 0
    }));
    this.stockItems.set(list);
    this.bulkQuantity.set(null);
  }

  submitStockRequest(): void {
    const totalQty = this.totalQuantityToAdd();
    if (totalQty <= 0) {
      this.snackBar.open('يرجى تحديد عدد القطع المراد إضافتها لخيار واحد على الأقل', 'تنبيه', { duration: 4000 });
      return;
    }

    this.isSubmitting.set(true);

    const validItems = this.stockItems()
      .filter(it => (Number(it.quantity_to_add) || 0) > 0)
      .map(it => ({
        id: it.stockId,
        sku: it.sku,
        name: this.product()?.Name_AR || this.product()?.Name || this.product()?.name || it.sku,
        option_name: it.option_name,
        quantity: Number(it.quantity_to_add),
        previous_stock: it.current_stock,
        current_stock: it.current_stock + Number(it.quantity_to_add),
        notes: it.notes || ''
      }));

    const prod = this.product();
    const payload = {
      product_id: this.productId() || prod?.id || 5,
      product_name: prod?.Name_AR || prod?.Name || prod?.name || 'قميص اكس فورد',
      product_image: prod?.image || prod?.img || 'https://angazny.fra1.cdn.digitaloceanspaces.com/imgs/cpx21/7F3nOI2HT68XqvWJsUmpQ5ugYLQs2E1qchvNCxQl.png',
      depot_id: this.depot_id,
      depot_name: this.depot_name,
      supplier_name: this.supplier_name.trim() || undefined,
      invoice_ref: this.invoice_ref.trim() || undefined,
      notes: this.notes.trim() || undefined,
      items: validItems
    };

    this.stockRequestService.createStockRequest(payload).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        if(res.status=="success"){
          this.snackBar.open('تم إنشاء وإرسال طلب إضافة المخزون بنجاح!', 'تم', { duration: 3500 });
        // Navigate to stock requests list for this product
        if (this.productId()) {
          this.router.navigate(['/products', this.productId(), 'stock-requests']);
        } else {
          this.router.navigate(['/products/stock-requests']);
        }
      }else{
          this.snackBar.open(res.message, '', { duration: 3500 });

      }
      },
      error: (err: any) => {
        console.error('Error submitting stock request:', err);
        this.isSubmitting.set(false);
        this.snackBar.open('حدث خطأ أثناء حفظ طلب المخزون', 'إغلاق', { duration: 3500 });
      }
    });
  }

  cancel(): void {
    if (this.productId()) {
      this.router.navigate(['/products', this.productId(), 'stock-requests']);
    } else {
      this.router.navigate(['/products/stock-requests']);
    }
  }

  /**
   * High fidelity fallback matching the exact JSON structure provided by the user.
   */
}

