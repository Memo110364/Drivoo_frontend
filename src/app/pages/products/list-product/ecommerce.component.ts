import { SelectionModel } from '@angular/cdk/collections';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { IconModule } from 'src/app/icon/icon.module';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DeleteDialogComponent } from '../../delete-dialog/delete-dialog.component';
import { ProductService as AppProductService } from 'src/app/services/apps/product/product.service';
import { ProductService as ProductApiService } from 'src/app/services/api/product.service';
import { Element } from './ecommerceData';
import { debounceTime, distinctUntilChanged, forkJoin, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-ecommerce',
  imports: [MaterialModule, IconModule, CommonModule],
  templateUrl: './ecommerce.component.html',
  styleUrl: './ecommerce.component.scss',
})
export class ProductComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild(MatTable) table!: MatTable<Element>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  private _snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private appProductService = inject(AppProductService);
  private productApiService = inject(ProductApiService);
  readonly dialog = inject(MatDialog);

  displayedColumns: string[] = [
    'select',
    'product_name',
    'date',
    'status',
    'base_price',
  ];
  dataSource = new MatTableDataSource<Element>([]);
  selection = new SelectionModel<Element>(true, []);
  durationInSeconds = 2;

  currentPage: number = 1;
  pageSize: number = 10;
  totalRecords: number = 0;
  isLoading: boolean = false;
  searchQuery: string = '';

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  constructor(
    private breakpointObserver: BreakpointObserver,
    private cdr: ChangeDetectorRef,
  ) {
    this.breakpointObserver
      .observe(['(max-width: 600px)'])
      .subscribe((result: BreakpointState) => {
        this.displayedColumns = result.matches
          ? ['product_name', 'date', 'stock', 'base_price']
          : [
              'select',
              'product_name',
              'date',
              'stock',
              'base_price',
              'actions',
            ];
      });
  }

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe((searchTerm) => {
        this.searchQuery = searchTerm;
        this.currentPage = 1;
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.loadProducts(1, this.pageSize, this.searchQuery);
      });

    this.loadProducts();

    // Listen to updates from edit page if any
    this.appProductService.productUpdated.subscribe(() => {
      this.loadProducts(this.currentPage, this.pageSize, this.searchQuery);
    });
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.page.subscribe((page) => {
        this.currentPage = page.pageIndex + 1;
        this.pageSize = page.pageSize;
        this.loadProducts(this.currentPage, this.pageSize, this.searchQuery);
      });
    }
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadProducts(
    page: number = this.currentPage,
    limit: number = this.pageSize,
    search: string = this.searchQuery
  ): void {
    this.isLoading = true;
    this.productApiService.getAllProducts(page, limit, {}, null, search).subscribe({
      next: (res: any) => {
        const rawList = res?.data || res?.products || [];
        this.totalRecords = res?.recordsTotal ?? res?.total ?? res?.pagination?.total ?? rawList.length;

        const mappedList: Element[] = rawList.map((item: any) => {
          let categoryName = '';
          if (Array.isArray(item.categories) && item.categories.length > 0) {
            categoryName = typeof item.categories[0] === 'string' ? item.categories[0] : (item.categories[0]?.name || '');
          } else if (item.category) {
            categoryName = typeof item.category === 'string' ? item.category : (item.category?.name || '');
          }

          let formattedDate = '';
          if (item.created_at) {
            const dt = new Date(item.created_at);
            formattedDate = isNaN(dt.getTime()) ? item.created_at : dt.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: '2-digit',
              year: 'numeric'
            });
          } else {
            formattedDate = item.date || '';
          }

          const isStock =
            item.status === 'active' ||
            item.status === true ||
            item.status === 'Stock' ||
            item.status === 1 ||
            (typeof item.stock === 'number' && item.stock > 0);

          return {
            id: item.id,
            imagePath:
              item.img ||
              item.image ||
              item.imagePath ||
              item.thumbnail ||
              (item.media && item.media[0]?.url) ||
              'assets/images/products/s3.jpg',
            product_name: item.name || item.product_name || item.title || '',
            categories: categoryName ? [categoryName] : [],
            date: formattedDate,
            status: isStock,
            stock:item.stock,
            base_price: Number(item.price ?? item.base_price ?? 0),
            dealPrice: Number(item.dealPrice ?? item.discounted ?? 0),
            description: item.description || '',
            rating: item.rating || 4.5,
            media: item.media,
            rawProduct: item
          };
        });

        this.dataSource.data = mappedList;
        if (this.paginator) {
          this.paginator.length = this.totalRecords;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching products:', err);
        this.isLoading = false;
        this.openSnackBar('حدث خطأ أثناء جلب المنتجات');
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.trim();
    this.searchSubject.next(filterValue);
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle(): void {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: Element): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${
      row.id + 1
    }`;
  }

  openSnackBar(message: string): void {
    this._snackBar.open(message, 'Close', {
      duration: this.durationInSeconds * 1000,
      verticalPosition: 'top',
      horizontalPosition: 'center',
    });
  }

  getDeletedById(id: number): void {
    this.productApiService.deleteProduct(id.toString()).subscribe({
      next: () => {
        this.openSnackBar('تم حذف المنتج بنجاح');
        this.loadProducts(this.currentPage, this.pageSize, this.searchQuery);
      },
      error: (err: any) => {
        console.error('Error deleting product:', err);
        this.openSnackBar('فشل حذف المنتج');
      }
    });
  }

  getViewNavigate(element: any): void {
    const raw = element?.rawProduct || element;
    this.appProductService.setProduct(raw);
    this.router.navigate(['apps/product/product-details']);
  }

  getEditProduct(element?: any): void {
    const raw = element?.rawProduct || element;
    this.appProductService.setProduct(raw);
    this.router.navigate(['apps/product/edit-product']);
  }

  openDialog(idOrIds: number | number[]): void {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      data: {
        ids: Array.isArray(idOrIds) ? idOrIds : [idOrIds],
      },
      width: '400px',
      enterAnimationDuration: '0ms',
      exitAnimationDuration: '0ms',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'delete') {
        if (Array.isArray(idOrIds)) {
          this.deleteSelectedIds(idOrIds);
        } else {
          this.getDeletedById(idOrIds);
        }
      }
    });
  }

  deleteSelected(): void {
    const selectedIds = this.selection.selected.map((item) => item.id);
    if (selectedIds.length > 0) {
      this.openDialog(selectedIds);
    }
  }

  deleteSelectedIds(ids: number[]): void {
    const deleteRequests = ids.map((id) =>
      this.productApiService.deleteProduct(id.toString())
    );
    forkJoin(deleteRequests).subscribe({
      next: () => {
        this.openSnackBar('تم حذف المنتجات المحددة بنجاح');
        this.selection.clear();
        this.loadProducts(this.currentPage, this.pageSize, this.searchQuery);
      },
      error: (err: any) => {
        console.error('Error deleting selected products:', err);
        this.openSnackBar('فشل حذف بعض المنتجات');
        this.loadProducts(this.currentPage, this.pageSize, this.searchQuery);
      }
    });
  }

  getAddProductNavigate(): void {
    this.router.navigate(['/products/create']);
  }
}
