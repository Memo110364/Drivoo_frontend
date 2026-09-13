import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  Optional,
  Signal,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconModule } from 'src/app/icon/icon.module';
import { MaterialModule } from 'src/app/material.module';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { Router } from '@angular/router';
import { MediaMatcher } from '@angular/cdk/layout';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductService as ProductApiService } from 'src/app/services/api/product.service';
import { ProductService} from 'src/app/services/apps/product/product.service';
import { Product } from 'src/app/pages/products/product.object';
import { ViewProductComponent } from '../view-product/view-product.component';
import {MatSliderModule} from '@angular/material/slider';
export interface Section {
  name: string;
  icon: string;
}

@Component({
  selector: 'app-shop',
  imports: [
    MaterialModule,
    IconModule,
    CommonModule,
    FormsModule,
    NgScrollbarModule,
    ViewProductComponent,
    MatSliderModule,
  ],
  templateUrl: './list-product.component.html',
  styleUrl: './list-product.component.scss',
})
export class ListProductComponent implements OnInit {
  selectedProduct = signal<Product | null>(null);

  
  mobileQuery: MediaQueryList;
  private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 1199px)`);
  durationInSeconds = 1;
  searchText: string = '';
  filterProducts: any = {};
  currentPage: number = 1;
  pageLimit: number = 24;
  sort_by:{field:string,direction:string}|null=null;
  isProductLoading=signal<boolean>(true);
  private debounceTimer: any;
  readonly DEFAULT_START = 0;
  readonly DEFAULT_END = 10000;

  startValue = this.DEFAULT_START;
  endValue = this.DEFAULT_END;

  filteredCards: Product[] = [];
  folders: Section[] = [
    { name: 'all', icon: 'users' },
  ];
  selectedCategory: string = this.folders[0].name;
  notes: Section[] = [
    { name: 'newest', icon: 'calendar' },
    { name: 'Price: High-Low', icon: 'sort-descending' },
    { name: 'Price: Low-High', icon: 'sort-ascending' },
    { name: 'discounted', icon: 'percentage' },
  ];
  selectedSortBy: string = this.notes[0].name;
  selectedColor: string | null = null;
  isMobileView = false;


  constructor(
    private dialog: MatDialog,
    private productApiService: ProductApiService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef,
    private _snackBar: MatSnackBar,
    private media: MediaMatcher,
    private productService: ProductService,
    @Optional() public dialogRef?: MatDialogRef<ListProductComponent>
  ) {
    this.mobileQuery = this.media.matchMedia('(max-width: 1199px)');
    this.isMobileView = this.mobileQuery.matches;

    this.mobileQuery.addEventListener('change', (e) => {
      this.isMobileView = e.matches;
    });
  }

  ngOnInit(): void {
    this.getAllCategories();
    this.getProductList();

  }
    getAllCategories() {
      this.productApiService.getCategories().subscribe({
        next: (res) => {
          const allCategories = res.data.map((category: any) => {
            return {
              name: category.name,
              icon: category.icon
            };
          });
          this.folders = [{ name: 'all', icon: 'users' }, ...allCategories];
        },  
        error: (err) => {
          console.error('Error fetching categories:', err);
        }
      });
    }
  getProductList() {
    this.isProductLoading.set(true);
    const page = this.currentPage;
    const limit = this.pageLimit;
    const Filter = this.filterProducts;
    const searchQuery = this.searchText;
    const sort_by = this.sort_by;    
    
    this.productApiService.getAllProducts(page, limit, Filter,sort_by,searchQuery).subscribe({
      next: (res) => {
        this.filteredCards = res.data;
        this.isProductLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching products:', err);
        this.isProductLoading.set(false);
      }
    });
  }

  searchProducts() {
    this.currentPage = 1;
    this.getProductList();
  }
  
  getCategory(name: string): void {
    this.currentPage = 1;
    this.filterProducts['category'] = name;
    this.selectedCategory = name;
    this.getProductList();
  }
  
  getSorted(name: string): void {
    this.currentPage = 1;
    const nameLower = name.toLowerCase();
    this.selectedSortBy=name;
    
    switch (nameLower) {
      case 'newest':
        this.sort_by = {field:'created_at',direction:'desc'};
        break;

      case 'price: hiah-low':
      case 'price: high-low':
        this.sort_by = {field:'price',direction:'desc'};
        break;

      case 'price: low-hiah':
      case 'price: low-high':
        this.sort_by = {field:'price',direction:'asc'};
        break;

      case 'discounted':
        this.sort_by = {field:'discount',direction:'desc'};
        break;

      default:
        this.sort_by = null;
       
    }
    this.currentPage = 1;
 this.getProductList();
    }
  
  formatLabel(value: number): string {
    console.log("value: ",value);
    
    if (value == 10000) {
      // return infinity
      return "∞";
    }else if (value >= 1000) {
      //format price to be like 4.5k or 1.1k
      const roundedValue = Math.round(value / 100) / 10;
      return roundedValue.toString() + 'k';
      
    }

    return value.toString();
  }


  getPricing(event: Event, type: 'start' | 'end'): void {
    const value=Number((event.target as HTMLInputElement).value)
    if (type=="start") {
      if (!isNaN(value) && value>0) {
        this.filterProducts['price_start']=value
      }else{
        //remove price_start if exist
        if (this.filterProducts['price_start']) {
          delete this.filterProducts['price_start']
        }
      }
    }else if(type=="end"){
      if (!isNaN(value) && value<10000) {
        this.filterProducts['price_end']=value
      }else{
        //remove price_end if exist
        if (this.filterProducts['price_end']) {
          delete this.filterProducts['price_end']
        }
      }
    }

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
          this.currentPage = 1;
          this.getProductList();
    }, 500); 
  }
  getRestFilter() {
    this.currentPage = 1;
    this.filterProducts = {};
    this.selectedCategory = 'all';
    this.sort_by = null;
    this.selectedSortBy = this.notes[0].name;
    this.startValue = this.DEFAULT_START;
    this.endValue = this.DEFAULT_END;
    this.getProductList();
  }

  getDefaultProductList() {
    this.searchText = '';
    this.getProductList();
  }

  isOver(): boolean {
    // return false
    return this.mediaMatcher.matches;
  }

  getDeletedById(id: number) {
  }
  openSnackBar(message: string) {
    this._snackBar.open(message, 'Close', {
      duration: this.durationInSeconds * 1000,
      verticalPosition: 'top',
      horizontalPosition: 'center',
    });
  }
  getviewDetails(productcardDetails: Product) {
    this.productService.setProduct(productcardDetails);
    this.selectedProduct.set(productcardDetails);
  }

  onAddProductFromView(event: any) {
    if (this.dialogRef) {
      this.dialogRef.close(event);
    }
  }
  toggleColor(color: string): void {
    this.selectedColor = this.selectedColor === color ? null : color;
  }
 
  getStarClass(index: number, rating?: number): string {
    const safeRating = rating ?? 0 ; // Fallback if undefined
    const fullStars = Math.floor(safeRating); // Full stars
    const partialStars = safeRating % 1 !== 0; // Whether there is a partial star
  
    if (index < fullStars) {
      return 'fill-warning'; // full star
    } else if (index === fullStars && partialStars) {
      return 'text-warning'; // partial star
    } else {
      return ''; // empty star, no class
    }
  }
  
  
  
}