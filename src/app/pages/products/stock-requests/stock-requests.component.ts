import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslateModule } from '@ngx-translate/core';

import { StockRequestService, StockRequest } from 'src/app/services/api/stock-request.service';
import { ProductService as ProductApiService } from 'src/app/services/api/product.service';
import { StockRequestDetailsDialogComponent } from './stock-request-details-dialog/stock-request-details-dialog.component';
import { NewStockRequestDialogComponent } from './new-stock-request-dialog/new-stock-request-dialog.component';

@Component({
  selector: 'app-stock-requests',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule,
    RouterLink
  ],
  templateUrl: './stock-requests.component.html',
  styleUrl: './stock-requests.component.scss'
})
export class StockRequestsComponent implements OnInit {
  productId = signal<string | null>(null);
  product = signal<any | null>(null);
  stockRequests = signal<StockRequest[]>([]);
  isLoading = signal<boolean>(false);

  searchQuery = signal<string>('');
  selectedStatus = signal<string>('all');

  filteredRequests = computed(() => {
    let list = this.stockRequests();
    const status = this.selectedStatus();
    const query = this.searchQuery().trim().toLowerCase();

    if (status !== 'all') {
      list = list.filter(r => r.status === status);
    }

    if (query) {
      list = list.filter(r =>
        r.request_code.toLowerCase().includes(query) ||
        r.product_name.toLowerCase().includes(query) ||
        r.depot_name.toLowerCase().includes(query) ||
        (r.supplier_name && r.supplier_name.toLowerCase().includes(query)) ||
        r.items.some(it => it.sku.toLowerCase().includes(query) || (it.option_name && it.option_name.toLowerCase().includes(query)))
      );
    }

    return list;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stockRequestService: StockRequestService,
    private productApiService: ProductApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.productId.set(id);
      if (id) {
        this.loadProductDetails(Number(id));
      }
      this.loadRequests(id ?? undefined);
    });
  }

  loadProductDetails(id: number): void {
    this.productApiService.getProductById(id).subscribe({
      next: (res: any) => {
        const prod = res?.data?.product || res?.data || res;
        if (prod) {
          this.product.set(prod);
        }
      },
      error: (err: any) => {
        console.warn('Could not fetch product details:', err);
      }
    });
  }

  loadRequests(productId?: string): void {
    this.isLoading.set(true);
    this.stockRequestService.getStockRequests(productId).subscribe({
      next: (list) => {
        this.stockRequests.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading stock requests:', err);
        this.isLoading.set(false);
      }
    });
  }

  openDetails(request: StockRequest): void {
    this.dialog.open(StockRequestDetailsDialogComponent, {
      data: request,
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh'
    });
  }

  goToCreateRequest(): void {
    const id = this.productId();
    if (id) {
      this.router.navigate(['/products', id, 'stock-requests', 'create']);
    } else {
      this.snackBar.open('يرجى اختيار منتج أولاً لإضافة وتوريد المخزون', 'إغلاق', { duration: 3500 });
      this.router.navigate(['/products']);
    }
  }

  openNewRequestDialog(): void {
    this.goToCreateRequest();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-light-success text-success';
      case 'in_transit':
        return 'bg-light-primary text-primary';
      case 'pending':
        return 'bg-light-warning text-warning';
      case 'rejected':
        return 'bg-light-error text-error';
      default:
        return 'bg-light-secondary text-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return 'circle-check';
      case 'in_transit':
        return 'truck-delivery';
      case 'pending':
        return 'clock';
      case 'rejected':
        return 'circle-x';
      default:
        return 'info-circle';
    }
  }

  get totalPiecesInFiltered(): number {
    return this.filteredRequests().reduce((sum, r) => sum + (r.total_quantity || 0), 0);
  }
}

