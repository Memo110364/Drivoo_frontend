import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../services/api/dashboar.service';
import { AppOrdersStatusComponent } from "src/app/components/orders-status/orders-status.component";
import { AppRevenueForecastComponent } from "src/app/components/revenue-forecast/revenue-forecast.component";
// import { AppCardsComponent } from "src/app/components/cards/cards.component"
import { MatCardModule } from '@angular/material/card';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatIconModule } from '@angular/material/icon';
import { AppCardsComponent } from "src/app/components/cards/cards.component";
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard',
  imports: [
    AppOrdersStatusComponent,
    AppRevenueForecastComponent,
    MatCardModule,
    MatIconModule,
    TablerIconsModule,
    AppCardsComponent,
    TranslateModule,
    
],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {

  dashboardData?: {
    total_orders: string;
    revenue: string;
    delivery_rate: string;
    return_rate: string;
    average_delivery: string;
    net_profit: string;
  };

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        console.log('Dashboard Data:', data);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
      }
    });
  }

}
