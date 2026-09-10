import { MaterialModule } from 'src/app/material.module';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import {
  Component,
  OnInit,
  Inject,
  NgZone,
  PLATFORM_ID,
  AfterViewInit,
  signal,
} from '@angular/core';
import { DashboardService } from '../../services/api/dashboar.service';
//import { isPlatformBrowser } from '@angular/common';

// amCharts imports
//import * as am5 from '@amcharts/amcharts5';
//import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
//import * as am5map from '@amcharts/amcharts5/map';
//import am5geodata_worldLow from '@amcharts/amcharts5-geodata/worldLow';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-orders-status',
  standalone: true,
  imports: [MaterialModule, NgxSkeletonLoaderModule,TranslateModule],
  templateUrl: './orders-status.component.html',
})
export class AppOrdersStatusComponent {
  isLoading = signal(true);
  orderStatus:any|null=null;
  constructor(private dashboardService: DashboardService) {}

 

  ngOnInit(): void {
    this.loadOrderStatus();
  }

  loadOrderStatus() {
    this.dashboardService.getCurrentOrderStatus().subscribe({
      next: (data) => {
        this.orderStatus = data;
        this.isLoading.set(false);
        console.log('Order Status:', data);
      },
      error: (error) => {
        console.error('Error loading order status:', error);
      }
    });
  }

  ngAfterViewInit() {
  
  }
}
