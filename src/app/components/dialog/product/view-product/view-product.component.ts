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
import { MatDialogRef } from '@angular/material/dialog';
//import { productcards } from 'src/app/pages/products/list-product/ecommerceData';

@Component({
  selector: 'app-view-product',
  imports: [MaterialModule, IconModule, CommonModule],
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
  //productcards = productcards;
  product: any;
  isSelected = false;

  quantity: number = 1;
  toggleValue: any = null;


  constructor(
    private router: Router,
    @Optional() private dialogRef?: MatDialogRef<any>
  ) {}

  ngOnInit(): void {
    if (this.productInput) {
      this.product = this.productInput;
    } else {
      this.product = this.productService.getProduct();
    }
  }

  ngOnDestroy() {
    
  }

  ngAfterViewInit(): void {}

  trackById(index: number, item: any): string {
    return item.id;
  }

  increaseQty() {
    this.quantity++;
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
    const itemData = {
      product: this.product,
      product_name: this.product?.name || this.product?.product_name || '',
      rate: this.product?.price ?? this.product?.base_price ?? 0,
      quantity: this.quantity
    };
    if (this.addProduct.observers.length > 0) {
      this.addProduct.emit(itemData);
    } else if (this.dialogRef) {
      this.dialogRef.close(itemData);
    }
  }

  toggleSelected() {
    this.isSelected = !this.isSelected;
  }
  resetToggleValue() {
    this.toggleValue = null;
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