import {
  Component,
  AfterViewInit,
  ViewChild,
  signal,
} from '@angular/core';
import { OrderService } from 'src/app/services/apps/order/order.service';
import { OrderList } from '../order-objects';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule , TranslateService } from '@ngx-translate/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
    selector: 'app-order-list',
    templateUrl: './list-order.component.html',
    imports: [
        MaterialModule,
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        TablerIconsModule,
        TranslateModule,
        NgxSkeletonLoaderModule
        ]
})
export class OrdersListComponent implements AfterViewInit {
  isLoading = signal<boolean>(true);
  invoiceList = new MatTableDataSource<OrderList>([]);
  activeTab = signal<string>('All');
  statusCount = signal<any>({"pending":0,"failed":0,"delivered":0,"shipped":0,"all":0});
  allInvoices = signal<OrderList[]>([]);
  searchQuery = signal<string>('');
  displayedColumns: string[] = [
    'id',
    'Name',
    'Phone',
    'City',
    'status',
    'action',
  ];
  
  statusList = {
    "pending":["1","2","6","8","10","12","13","14","15","17","18","19"],
    "failed":["4","5","11","16"],
    "delivered":["9","3"],
    "shipped":["7"]
  };
  @ViewChild(MatSort) sort: MatSort = Object.create(null);
  @ViewChild(MatPaginator) paginator: MatPaginator = Object.create(null);

  constructor(private orderService: OrderService,private dialog: MatDialog, private snackBar: MatSnackBar, private translate: TranslateModule,private translateService: TranslateService) {}

  ngOnInit(): void {
    this.loadOrders();
    this.orderService.getOrderStatusCount([]).subscribe((res) => {
      console.log("status count",res);
      
      let resData = {
        "pending":this.countInvoicesByStatus(res,this.statusList["pending"]),
        "failed":this.countInvoicesByStatus(res,this.statusList["failed"]),
        "delivered":this.countInvoicesByStatus(res,this.statusList["delivered"]),
        "shipped":this.countInvoicesByStatus(res,this.statusList["shipped"]),
        "all":0
      };
      resData["all"] = resData["pending"] + resData["failed"] + resData["delivered"] + resData["shipped"];
      this.statusCount.set(resData);
    });
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe((page) => {
      this.loadOrders(page.pageIndex + 1, page.pageSize);
    });
    this.invoiceList.paginator = this.paginator;
    this.invoiceList.sort = this.sort;
  }

  handleTabClick(tab: string): void {
    this.activeTab.set(tab);
    this.paginator.pageIndex = 0;
    this.loadOrders(1, this.paginator.pageSize);
  }
  loadOrders(page?: number, pageSize?: number): void {
    
    let statusFilter:string[] = [];
    const currentTab = this.activeTab();
    switch(currentTab.toLowerCase()){
      case 'pending':
        statusFilter = this.statusList["pending"];
        break;
      case 'failed':
        statusFilter = this.statusList["failed"];
        break;
      case 'delivered':
        statusFilter = this.statusList["delivered"];
        break;
      case 'shipped':
        statusFilter = this.statusList["shipped"];
        break;
      default:
        statusFilter = [];
        break;
    }
    this.isLoading.set(true);
    this.orderService.getInvoiceList(page, pageSize,statusFilter).subscribe((res) => {
      this.allInvoices.set(res.data);
      this.paginator.length = res.recordsTotal;
      this.invoiceList = new MatTableDataSource(this.allInvoices());
      this.isLoading.set(false);
      if(res.data.length==0){
        this.showSnackbar(this.translateService.instant('system_messages.no_orders'));
      }
    });
  }
  filter(filterValue: string): void {
    if(filterValue.length>=3){
      this.searchQuery.set(filterValue);
       this.paginator.pageIndex = 0;
      this.loadOrders(1, this.paginator.pageSize); 
    }
    else if(filterValue.length==0){
      this.searchQuery.set(filterValue);
      this.paginator.pageIndex = 0;
      this.loadOrders(1, this.paginator.pageSize); 
    }
  }

   countInvoicesByStatus(date: any,status: string[]): number {
     return status.reduce((total, key) => {
    return total + (date[key] ?? 0); 
  }, 0);
   
  }

 

  showSnackbar(message: string): void {
    this.snackBar.open(message, this.translateService.instant('system_messages.close'), {
      duration: 3000, 
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
  
}
