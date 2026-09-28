import {CommonModule} from '@angular/common';
import {Component, inject, input, OnInit, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatTableModule} from '@angular/material/table';
import {TranslateModule} from '@ngx-translate/core';
import {MatButtonModule} from "@angular/material/button";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {InvoiceEntry, WalletService} from '../../../../services/api/wallet.service';
import {MaterialModule} from 'src/app/material.module';
import {NgxSkeletonLoaderComponent} from 'ngx-skeleton-loader';
import {InvoiceDetailsComponent} from '../../../../components/dialog/finance/invoice-details/invoice-details.component';
import {MatDialog} from '@angular/material/dialog';
import {CoreService} from 'src/app/services/core.service';
@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, MaterialModule, TranslateModule, MatIconModule, MatMenuModule, MatPaginatorModule, MatTableModule, MatButtonModule, MatDatepickerModule, NgxSkeletonLoaderComponent],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss',
})
export class InvoicesComponent implements OnInit {
  currency = input<string>();
  private walletService = inject(WalletService);
  private settings = inject(CoreService);
  options = this.settings.getOptions();
  rows = signal<InvoiceEntry[]>([]);
  loading = signal(true);
  isExporting = signal(false);
  hasError = signal(false);
  total = signal(0);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    this.walletService.getInvoices().subscribe({
      next: (res) => {
        this.rows.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.hasError.set(true);
        this.loading.set(false);
      },
    });
  }


  statusClass(status: string) {
    if (status === 'paid') {
      return 'success';
    }
    if (status === 'pending') {
      return 'warning';
    }
    if (status === 'unpaid') {
      return 'error';
    }
    return 'muted';
  }
  invoiceIcons(type:string){
if (type === 'paid') {
  return 'carbon:receipt-verification';
}
if (type === 'pending') {
  return 'mdi:receipt-text-clock';
}
if (type === 'unpaid') {
  return 'iconmind:invoice-draft-outline-thin';
}
return 'solar:bill-list-outline';
  }
  formatDate(date: string) {
    return new Date(date).toLocaleDateString();
  }

  viewInvoice(invoice: InvoiceEntry) {
    //open dialog
    this.dialog.open(InvoiceDetailsComponent, {
      width: '90%',
      maxWidth: '95vw',
      maxHeight: '95vh',
      height: '90%',
      direction: this.options.dir,
      data: invoice,
    });
  }
}
