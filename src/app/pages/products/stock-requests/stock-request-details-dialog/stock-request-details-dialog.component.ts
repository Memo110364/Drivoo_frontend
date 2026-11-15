import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslateModule } from '@ngx-translate/core';
import { StockRequest } from 'src/app/services/api/stock-request.service';

@Component({
  selector: 'app-stock-request-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule
  ],
  templateUrl: './stock-request-details-dialog.component.html',
  styleUrl: './stock-request-details-dialog.component.scss'
})
export class StockRequestDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<StockRequestDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public request: StockRequest
  ) {}

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

  close(): void {
    this.dialogRef.close();
  }

  print(): void {
    window.print();
  }
}

