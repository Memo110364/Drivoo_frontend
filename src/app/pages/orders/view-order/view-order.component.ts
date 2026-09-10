import { Component, signal } from '@angular/core';
import { OrderService } from 'src/app/services/apps/order/order.service';
import { OrderFullDetails } from '../order-objects';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-order-view',
    templateUrl: './view-order.component.html',
    imports: [
        MaterialModule,
        CommonModule,
        RouterLink,
        FormsModule,
        ReactiveFormsModule,
        TablerIconsModule,
        TranslateModule
        
    ]
})
export class ViewOrderComponent {
  id = signal<number>(0);
  invoiceDetail = signal<OrderFullDetails | null>(null);
  invoiceFinancial = signal<any>({"total":0,"tax":0,"grandTotal":0,"shipping":0,"discount":0});
  displayedColumns: string[] = ['itemName', 'unitPrice', 'unit', 'total'];

  constructor(
    private activatedRouter: ActivatedRoute,
    private orderService: OrderService,
    public translate: TranslateModule
  ) {}

  ngOnInit(): void {
    this.id.set(+this.activatedRouter.snapshot.paramMap.get('id')!);

    this.loadInvoiceDetail();
  }

  private loadInvoiceDetail(): void {
    this.orderService.getOrderById(this.id()).subscribe((res) => {
      
      this.invoiceDetail.set(res.data);
    });
  }
  public totalInvoice(){
    var total=0;
    this.invoiceDetail()?.items.forEach(function (order_item,index) {
      total+=order_item.rate*order_item.quantity
    })
    return total;
    

  }
}
