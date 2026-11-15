import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslateModule } from '@ngx-translate/core';
import { StockRequestService } from 'src/app/services/api/stock-request.service';

export interface NewStockRequestItemInput {
  sku: string;
  name: string;
  option_name: string;
  quantity: number;
  notes: string;
}

@Component({
  selector: 'app-new-stock-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule
  ],
  templateUrl: './new-stock-request-dialog.component.html',
  styleUrl: './new-stock-request-dialog.component.scss'
})
export class NewStockRequestDialogComponent implements OnInit {
  product_id: number = 5;
  product_name: string = 'قميص اكس فورد';
  depot_name: string = 'المخزن الرئيسي - القاهرة';
  supplier_name: string = '';
  notes: string = '';

  items: NewStockRequestItemInput[] = [];

  constructor(
    public dialogRef: MatDialogRef<NewStockRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private stockRequestService: StockRequestService
  ) {}

  ngOnInit(): void {
    if (this.data?.product) {
      this.product_id = this.data.product.id || 5;
      this.product_name = this.data.product.name || this.data.product.product_name || 'قميص اكس فورد';
    }

    // Default template items for SKUs
    if (this.data?.skus && Array.isArray(this.data.skus) && this.data.skus.length > 0) {
      this.items = this.data.skus.map((s: any) => ({
        sku: s.sku || s,
        name: s.name || this.product_name,
        option_name: s.option || '',
        quantity: 50,
        notes: ''
      }));
    } else {
      this.items = [
        {
          sku: '4 - default',
          name: this.product_name,
          option_name: 'المقاس: L | اللون: سماوي',
          quantity: 50,
          notes: ''
        },
        {
          sku: '5 - اسود - XXL',
          name: this.product_name,
          option_name: 'المقاس: XXL | اللون: أسود',
          quantity: 50,
          notes: ''
        }
      ];
    }
  }

  addItem(): void {
    this.items.push({
      sku: '',
      name: this.product_name,
      option_name: '',
      quantity: 10,
      notes: ''
    });
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    }
  }

  get totalQuantity(): number {
    return this.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }

  save(): void {
    const validItems = this.items.filter(it => it.sku && it.quantity > 0);
    if (validItems.length === 0) {
      alert('يرجى تحديد كود الـ SKU وكمية واحدة على الأقل');
      return;
    }

    const payload = {
      product_id: this.product_id,
      product_name: this.product_name,
      depot_name: this.depot_name,
      supplier_name: this.supplier_name,
      notes: this.notes,
      items: validItems
    };

    this.stockRequestService.createStockRequest(payload).subscribe({
      next: (res) => {
        this.dialogRef.close(res?.data || payload);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}

