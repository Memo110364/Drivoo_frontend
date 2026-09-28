import { Component, inject, OnInit, signal  } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {InvoiceDetails, WalletService,InvoiceItem} from 'src/app/services/api/wallet.service';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';
import { downloadCsv } from '../../../../pages/finance/shared/csv-export';

@Component({
  selector: 'app-invoice-details',
  standalone: true,
  imports: [MaterialModule, TranslateModule, NgxSkeletonLoaderComponent],
  templateUrl: './invoice-details.component.html',
  styleUrl: './invoice-details.component.scss',
})
export class InvoiceDetailsComponent implements OnInit {
  translate = inject(TranslateService);
  invoiceId = inject(MAT_DIALOG_DATA).id;
  isloading=signal<boolean>(true);
  hasError=signal<boolean>(false);
  walletService=inject(WalletService)
  invoiceDetails=signal<InvoiceDetails>({
    id: '',
    date: '',
    status: '',
    amount: 0,
    invoice_number: '',
    items: [],
    additionals: [],
  })
  displayedColumns=["service_name","count","cost"];
  displayedColumnsAdd=["description","cost"];
  //items is array of invoice items group by service_name
  items=signal<{service_name:string,rows:InvoiceItem[]}[]>([]) 
  isExporting =signal<boolean>(false);

  ngOnInit(): void {
    this.walletService.getInvoice(this.invoiceId).subscribe({
      next: (res: InvoiceDetails) => {
        this.invoiceDetails.set(res);
        this.refineItems()
        this.isloading.set(false);
      },
      error: (err) => {
        this.isloading.set(false);
        this.hasError.set(true);
      },
    });
  }
  refresh() {
    this.isloading.set(true);
    this.hasError.set(false);
    this.walletService.getInvoice(this.invoiceId).subscribe({
      next: (res: InvoiceDetails) => {
        this.invoiceDetails.set(res);
        this.isloading.set(false);
      },
      error: (err) => {
        this.isloading.set(false);
        this.hasError.set(true);
      },
    });
  }
  refineItems(){
   this.items.set(this.invoiceDetails().items.reduce((acc, item) => {
    const existingService = acc.find(
      (group) => group.service_name === item.service_name
    );

    if (existingService) {
      existingService.rows.push(item);
    } else {
      acc.push({
        service_name: item.service_name,
        rows: [item],
      });
    }

    return acc;
  }, [] as { service_name: string; rows: InvoiceItem[] }[]));
}
exportExcel(){
  this.isExporting.set(true);
  this.writeCsv(this.invoiceDetails());
  this.isExporting.set(false);

}


private writeCsv(invoice: InvoiceDetails): void {
    const t = (key: string) => this.translate.instant(key);
    const header = [
      t('wallet.invoices.service_name'),
      t('wallet.invoices.reference_type'),
      t('wallet.invoices.reference'),
      t('wallet.invoices.cost'),
      t('wallet.invoices.description')
    ];
    const body = [...invoice.items.map((item) => {
      let references_type: string[] = item.reference_type.split('\\').reverse();
     
      return [
      t('wallet.service_type.'+item.service_name),
      item.reference,
      references_type[0],
      item.cost,
      ""
    ]}),...invoice.additionals.map((row) => {

      return [
        "",
        "",
        "",
        row.cost,
        row.description
      ]
    })];
     
    downloadCsv('invoice-'+invoice.invoice_number, header, body);
  }



}