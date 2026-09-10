import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  Signal,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconModule } from 'src/app/icon/icon.module';
import { MaterialModule } from 'src/app/material.module';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { Router } from '@angular/router';
import { MediaMatcher } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductService as ProductApiService } from 'src/app/services/api/product.service';
import { ProductService} from 'src/app/services/apps/product/product.service';
import { Product } from 'src/app/pages/products/product.object';

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
  ],
  templateUrl: './list-product.component.html',
  styleUrl: './list-product.component.scss',
})
export class ListProductComponent implements OnInit {
  
  mobileQuery: MediaQueryList;
  private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 1199px)`);
  durationInSeconds = 1;
  searchText: string = '';
  filterProducts: any = {};
  currentPage: number = 1;
  pageLimit: number = 24;
  sort_by:{field:string,direction:string}|null=null;
  isProductLoading=signal<boolean>(true);
  
  filteredCards: Product[] = [];
  folders: Section[] = [
    { name: 'all', icon: 'users' },
    { name: 'fashion', icon: 'hanger' },
    { name: 'books', icon: 'book' },
    { name: 'toys', icon: 'mood-smile' },
    { name: 'electronics', icon: 'device-laptop' },
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
  selectedGender: string = 'all';
  genderOptions = [
    { label: 'All', value: 'all' },
    { label: 'Men', value: 'men' },
    { label: 'Women', value: 'women' },
    { label: 'Kids', value: 'kids' },
  ];

  selectedPrice: string = 'all';
  priceOptions = [
    { label: 'All', value: 'all' },
    { label: '0 - 50', value: '0-50' },
    { label: '50 - 100', value: '50-100' },
    { label: '100 - 200', value: '100-200' },
    { label: 'Over 200', value: 'over-200' },
  ];
  constructor(
    private dialog: MatDialog,
    private productApiService: ProductApiService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef,
    private _snackBar: MatSnackBar,
    private media: MediaMatcher,
    private productService: ProductService
  ) {
    this.mobileQuery = this.media.matchMedia('(max-width: 1199px)');
    this.isMobileView = this.mobileQuery.matches;

    this.mobileQuery.addEventListener('change', (e) => {
      this.isMobileView = e.matches;
    });
  }
  ngOnInit(): void {
    this.getProductList();
  }

  getProductList() {
    this.isProductLoading.set(true);
    const page = this.currentPage;
    const limit = this.pageLimit;
    const Filter = this.filterProducts;
    const searchQuery = this.searchText;
    const sort_by = this.sort_by;
    
    this.productApiService.getAllProducts(page, limit, Filter,sort_by,searchQuery).subscribe((res) => {
      this.filteredCards = res.data;
      // this.isProductLoading.set(false);
    });
  }

  searchProducts() {
    this.currentPage = 1;
    this.getProductList();
  }
  
  getCategory(name: string): void {
    this.currentPage = 1;
    this.filterProducts['category'] = name;
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

      case 'base_price: hiah-low':
      case 'base_price: high-low':
        this.sort_by = {field:'price',direction:'desc'};
        break;

      case 'base_price: low-hiah':
      case 'base_price: low-high':
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
  
  

  getGender(value: string): void {
 
  }
  getPricing(base_priceRange: string): void {
    this.selectedPrice = base_priceRange;

    switch (base_priceRange) {
      case '0-50':
        this.filterProducts['min_price'] = 0;
        this.filterProducts['max_price'] = 50;
        break;

      case '50-100':
        this.filterProducts['min_price'] = 50;
        this.filterProducts['max_price'] = 100;
        break;

      case '100-200':
        this.filterProducts['min_price'] = 100;
        this.filterProducts['max_price'] = 200;
        break;

      case 'over-200':
        this.filterProducts['min_price'] = 200;
        this.filterProducts['max_price'] = 9999999;
        break;

      case 'all':
      default:
        this.filterProducts['min_price'] = 0;
        this.filterProducts['max_price'] = 9999999;
        break;
      }
      this.currentPage = 1;
      this.getProductList();
  }
  getRestFilter() {
    this.currentPage = 1;
    this.filterProducts = {};
    this.sort_by = null;
    this.selectedSortBy = this.notes[0].name;
    this.getProductList();
  }

  getDefaultProductList() {
    this.searchText = '';
    this.getProductList();
  }

  isOver(): boolean {
    return false
    return this.mediaMatcher.matches;
  }


  openDialog(idOrIds: number | number[]): void {
   
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
    this.router.navigate(['apps/product/product-details']);
  }
  toggleColor(color: string): void {
    this.selectedColor = this.selectedColor === color ? null : color;
  }
  getEditedProduct(productcardDetails: Product) {
    this.productService.setProduct(productcardDetails);
    this.router.navigate(['apps/product/edit-product']);
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