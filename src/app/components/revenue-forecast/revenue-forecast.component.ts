import { Component, signal, ViewChild, OnInit } from '@angular/core';
import { MaterialModule } from '../../material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { DashboardService } from '../../services/api/dashboar.service';
import { CoreService } from '../../services/core.service';
import {
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
  ApexStroke,
  ApexTooltip,
  ApexAxisChartSeries,
  ApexPlotOptions,
  NgApexchartsModule,
  ApexFill,
} from 'ng-apexcharts';
import { NgxSkeletonLoaderComponent } from "ngx-skeleton-loader";
import {TranslateModule} from '@ngx-translate/core';

export interface revenueForecastChart {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  legend: ApexLegend;
  fill: ApexFill;
}

@Component({
  selector: 'app-revenue-forecast',
  standalone: true,
  imports: [MaterialModule, TablerIconsModule, NgApexchartsModule, NgxSkeletonLoaderComponent,TranslateModule],
  templateUrl: './revenue-forecast.component.html',
})
export class AppRevenueForecastComponent implements OnInit {
  isLoading = signal(true);
  @ViewChild('chart') chart: ChartComponent = Object.create(null);
  public revenueForecastChart!: Partial<revenueForecastChart> | any;
ngOnInit(){
  this.dashboardService.getRevenueLastThirtyDays().subscribe({
    next: (data) => {
      this.revenueForecastChart.series[0].data = data.orders;
      this.isLoading.set(false);
      console.log('revenueForecastChart Status:', this.revenueForecastChart);
    },
    error: (error) => {
      console.error('Error loading order status:', error);
    }
  });
}
generateDates(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    days.push(date.toLocaleDateString(this.coreService.getLanguage(), { day: 'numeric', month: 'short' }));
  }
  return days.reverse();
}
  constructor(private dashboardService: DashboardService,private coreService: CoreService) {
    const dates = this.generateDates();
    this.revenueForecastChart = {
      series: [
        {
          name: 'Orders',
          data: [],
        },
      ],

      chart: {
        type: 'area',
        fontFamily: 'inherit',
        foreColor: '#adb0bb',
        toolbar: {
          show: false,
        },
        height: 300,
        width: '100%',
        stacked: false,
        offsetX: -10,
      },
      colors: ['#16cdc7'],
      stroke: {
        width: 2,
        curve: 'smooth',
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        show: false,
      },
      grid: {
        show: true,
        padding: {
          top: 0,
          bottom: 0,
        },
        borderColor: 'rgba(0,0,0,0.05)',
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0,
          inverseColors: false,
          opacityFrom: 0.45,
          opacityTo: 0,
          stops: [20, 180],
        },
      },
      xaxis: {
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        categories:dates,
      },
      markers: {
        strokeColor: ['rgba(255, 102, 146, 1)', '#16cdc7', 'rgba(99, 91, 255, 1)'],
        strokeWidth: 2,
      },
      tooltip: {
        theme: 'dark',
        x: {
          show: true,
        },
      },
    };
  }
}
