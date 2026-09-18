import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Optional,
  Output,
  ViewChild,
} from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { IconModule } from 'src/app/icon/icon.module';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService } from 'src/app/services/apps/product/product.service';
import { ProductService as ApiProductService } from 'src/app/services/api/product.service';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef } from '@angular/material/dialog';
//import { productcards } from 'src/app/pages/products/list-product/ecommerceData';

@Component({
  selector: 'app-view-product',
  imports: [MaterialModule, IconModule, CommonModule, TranslateModule],
  templateUrl: './view-product.component.html',
  styleUrl: './view-product.component.scss',
})
export class ViewProductComponent implements OnInit, AfterViewInit {
  @Input() productInput: any;
  @Output() back = new EventEmitter<void>();
  @Output() addProduct = new EventEmitter<any>();

  @ViewChild('carouselContainer', { static: false })
  carouselContainer!: ElementRef;

  private productService = inject(ProductService);

  productStored: any;
  productData: any = null; // يحوي res.data الكامل القادم من الـ API
  options: any[] = [];
  selectedOptions: { [optionId: number]: any } = {}; // option_id -> full value object
  selectedStockId: number | null = null;

  quantity: number = 1;
  maxQuantity: number = 0;
  isLoading: boolean = true;
  toggleValue: any = null;

  constructor(
    private router: Router,
    private productServiceApi: ApiProductService,
    @Optional() private dialogRef?: MatDialogRef<any>
  ) {}

  ngOnInit(): void {
    if (this.productInput) {
      this.productStored = this.productInput;
    } else {
      this.productStored = this.productService.getProduct();
    }

    const productId = this.productStored?.id || this.productInput?.id;
    if (productId) {
      this.loadingProduct(productId);
    } else {
      this.isLoading = false;
    }
  }

  ngAfterViewInit(): void {}

  loadingProduct(id: number) {
    this.isLoading = true;
    this.productServiceApi.getProductById(id).subscribe({
      next: (res: any) => {
        if (res && res.success && res.data) {
          this.productData = res.data;
          
          // إتاحة الخيارات
          this.options = res.data.options || [];

          // اختيار أول قيمة افتراضياً لكل خيار كـ object كامل
          this.options.forEach((opt: any) => {
            if (opt.values && opt.values.length > 0) {
              this.selectedOptions[opt.id] = opt.values[0];
            }
          });

          this.updateMaxStock();
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error fetching product details:', err);
        this.isLoading = false;
      }
    });
  }

  selectOptionValue(optionId: number, valueOrId: any) {
    let valObj = valueOrId;
    if (typeof valueOrId === 'number' || typeof valueOrId === 'string') {
      const opt = this.options.find(o => o.id === optionId);
      valObj = opt?.values?.find((v: any) => v.id === valueOrId);
    }
    if (valObj) {
      this.selectedOptions[optionId] = valObj;
      this.updateMaxStock();
    }
  }

  isOptionSelected(optionId: number, valueId: number): boolean {
    return this.selectedOptions[optionId]?.id === valueId;
  }

  updateMaxStock() {
    if (!this.productData) {
      this.maxQuantity = this.productStored?.stock || 999;
      this.selectedStockId = null;
      return;
    }

    const selectedValueIds = Object.values(this.selectedOptions).map((val: any) => val?.id ?? val);
    const stocksList = this.productData.stocks || this.productData.stocks_quantity_by_path || [];

    // البحث عن الـ Stock المناسب للمسار (path) للقيم المختارة
    const foundVariant = stocksList.find((item: any) => {
      if (!item.path || !Array.isArray(item.path)) return false;
      return (
        selectedValueIds.length === item.path.length &&
        selectedValueIds.every((id: number) => item.path.includes(id))
      );
    });

    if (foundVariant) {
      this.maxQuantity = foundVariant.stock;
      this.selectedStockId = foundVariant.id ?? null;
    } else {
      // في حال عدم وجود مسار مطابق تماماً، نأخذ الـ stock الرئيسي للمنتج
      this.maxQuantity = this.productData.product?.stock ?? this.productStored?.stock ?? 0;
      this.selectedStockId = null;
    }

    if (this.quantity > this.maxQuantity && this.maxQuantity > 0) {
      this.quantity = this.maxQuantity;
    } else if (this.maxQuantity === 0) {
      this.quantity = 1;
    }
  }

  increaseQty() {
    if (this.quantity < this.maxQuantity) {
      this.quantity++;
    }
  }

  decreaseQty() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  getBack() {
    if (this.back.observers.length > 0) {
      this.back.emit();
    } else {
      this.router.navigate(['apps/product/product-list']);
    }
  }

  addToOrder() {
    if (this.isLoading || this.maxQuantity === 0) return;

    const itemData = {
      product: this.productStored,
      product_name: this.productStored?.Name || this.productStored?.name || this.productStored?.product_name || '',
      rate: this.productStored?.price ?? this.productStored?.base_price ?? 0,
      quantity: this.quantity,
      stock_id: this.selectedStockId,
      selectedOptions: this.selectedOptions
    };

    if (this.addProduct.observers.length > 0) {
      this.addProduct.emit(itemData);
    } else if (this.dialogRef) {
      this.dialogRef.close(itemData);
    }
  }

  getStarClass(index: number, rating?: number): string {
    const safeRating = rating ?? 0;
    const fullStars = Math.floor(safeRating);
    const partialStars = safeRating % 1 !== 0;

    if (index < fullStars) {
      return 'fill-warning';
    } else if (index === fullStars && partialStars) {
      return 'text-warning';
    } else {
      return '';
    }
  }
}