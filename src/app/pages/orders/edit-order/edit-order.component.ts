import {Component, signal ,OnInit ,AfterViewInit } from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {OrderService} from 'src/app/services/apps/order/order.service';
import {LogisticsService} from 'src/app/services/api/logistics.service'
import {OrderFullDetails, OrderList} from '../order-objects';
import {TranslateModule} from '@ngx-translate/core';
import {forkJoin} from 'rxjs';
import {ListProductComponent} from 'src/app/components/dialog/product/list-product/list-product.component';
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {OkDialogComponent} from './ok-dialog/ok-dialog.component';
import {MaterialModule} from 'src/app/material.module';
import {CommonModule} from '@angular/common';
import {TablerIconsModule} from 'angular-tabler-icons';
import {MatSnackBar} from '@angular/material/snack-bar';
@Component({
  selector: 'app-edit-invoice',
  styleUrl: './edit-order.component.scss',
  templateUrl: './edit-order.component.html',
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
export class EditOrderComponent implements OnInit{
  id = signal<any>(null);
  editForm!: FormGroup;

  cities = signal<any[]>([]);
  areas = signal<any[]>([]);
  subTotal = signal<number>(0);
  vat = signal<number>(0);
  grandTotal = signal<number>(0);
  invoice = signal<OrderFullDetails | any>(null);
  areaList: { [key: string]: any[] } = {};

  constructor(
    activatedRouter: ActivatedRoute,
    private orderService: OrderService,
    private logisticsService: LogisticsService,
    private router: Router,
    private fb: FormBuilder,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    public translate: TranslateModule
  ) {
    this.id.set(activatedRouter.snapshot.paramMap.get('id'));
    
  }

  ngOnInit(): void {
    this.loadData();
  }

  updateTotals(): void {
    let subTotal = 0;
    this.editForm.get('items')?.value.forEach((item: any) => {
      subTotal += (item.itemCost ?? 0) * (item.itemQty ?? 0);
    });
    //this.subTotal.set(subTotal);
    //this.vat.set(subTotal * 0.15);
    this.grandTotal.set(subTotal);
  }

  loadData(): void {
    forkJoin({
      citiesRes: this.logisticsService.getCities(),
      invoiceRes: this.orderService.getOrderById(this.id())
    }).subscribe({
      next: ({ citiesRes, invoiceRes }) => {
        const citiesList = citiesRes?.data || [];
        this.cities.set(citiesList);
        for (const city of citiesList) {
          this.areaList[city.id] = city.areas || [];
        }
        //filter items where status_code = 1
        invoiceRes.data.items = invoiceRes?.data?.items.filter((item: any) => item.status_code == 1);
        const invoiceData = invoiceRes?.data;        
        this.invoice.set(invoiceData);
        if (invoiceData) {
          this.buildForm(invoiceData);
        }
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.showSnackbar('Error loading order data');
      }
    });
  }


  loadCities(): void {
    this.logisticsService.getCities().subscribe((res) => {
      const citiesList = res?.data || [];
      this.cities.set(citiesList);
      for (const city of citiesList) {
        this.areaList[city.id] = city.areas || [];
      }
    });
  }

  getAreasForCity(cityId: any): any[] {
    if (!cityId) return [];
    if (this.areaList[cityId]) {
      return this.areaList[cityId];
    }
    const foundCity = this.cities().find((c: any) => String(c.id) === String(cityId));
    return foundCity?.areas || [];
  }

  buildForm(invoice: any) {
    const cityId = invoice.city?.id ?? invoice.city_id ?? '';
    const areaId = invoice.area?.id ?? invoice.area_id ?? '';

    // Set initial areas signal based on the invoice's city
    this.areas.set(this.getAreasForCity(cityId));
    let totalIvoice = 0;
    this.editForm = this.fb.group({
      name: [invoice.Name || invoice.name || '', Validators.required],
      phone: [invoice.Phone || invoice.phone || '', Validators.required],
      city_id: [cityId ? cityId.toString() : '', Validators.required],
      area_id: [areaId ? areaId.toString() : '', Validators.required],
      address: [invoice.Address || invoice.address || '', Validators.required],
      items: this.fb.array(
        (invoice.items || []).map((item: any) => {
          if(item.status_code==1){
          totalIvoice += (item.rate ?? item.cost ?? 0) * (item.quantity ?? item.sold ?? 0);
          return this.fb.group({
            item_id: [item.id || null, Validators.nullValidator],
            itemName: [item.product_name || item.name || '', Validators.required],
            itemImage: [item.image || '', Validators.nullValidator],
            itemOption: [item.option || '', Validators.required],
            itemCost: [item.rate ?? item.cost ?? 0, Validators.required],
            itemQty: [item.quantity ?? item.sold ?? 0, Validators.required],
            itemTotal: [{ value: (item.rate ?? item.cost ?? 0) * (item.quantity ?? item.sold ?? 0), disabled: true }]
          });
        }else{
          return null
        }
        }).filter((item: any) => item !== null),
        [Validators.required, Validators.minLength(1)]
      )
    });
    this.grandTotal.set(totalIvoice);
    this.editForm.get('items')?.valueChanges.subscribe(() => {
      this.updateTotals();
    });
    this.editForm.get('city_id')?.valueChanges.subscribe(newCityId => {
      this.onCityChange(newCityId);
    });
  }

  onCityChange(cityId: any): void {
    this.areas.set(this.getAreasForCity(cityId));
    this.editForm.get('area_id')?.setValue(null);
  }

  loadAreas(cityId: any): void {
    this.onCityChange(cityId);
  }

  compareById(opt1: any, opt2: any): boolean {
    return opt1 != null && opt2 != null && opt1.toString() === opt2.toString();
  }

  compareCities(city1: any, city2: any): boolean {
    return this.compareById(city1, city2);
  }
  addItem():void {
    const dialogRef = this.dialog.open(ListProductComponent, {
      width: '90%',
      maxWidth: '95vw',
      maxHeight: '95vh',
      height: '90%',
      // scrollStrategy
      data: {
        items: this.invoice()?.orders
      }
    });
    dialogRef.afterClosed().subscribe((result: any) => {      
      if (result) {
        const currentInvoice = { ...(this.invoice() || {}) };
        if (!currentInvoice.items) {
          currentInvoice.items = [];
        }
        console.log('result',result);
        
        let newItem: any = null;
        if (result.product_name || result.name || result.product) {
          let optionValue = '';
          if (result.selectedOptions ) {
            const optionsArray = Object.values(result.selectedOptions);
            optionValue = optionsArray.map((opt: any) => opt.value).join(' - ');
          } 
          newItem = {
            
        id: null,
        product_name: result.product_name || '',
        image: result.product?.image || '',
        quantity: result.quantity ?? 0,
        option: optionValue || '',
        status: "PENDING",
        status_code: 1,
        rate: result.rate ?? 0,
        commission: 0,
        price_effect:  0,
        bonus: 0,
        amount: 0
      
    
          };
        }        
        if (newItem) {
          currentInvoice.items.push(newItem);
          this.invoice.set(currentInvoice);
          this.buildForm(currentInvoice);
        }
      }
    });
  }


onQuantityChange(event: any, index: number): void {
 
}
removeRow(index: number): void {
      const currentInvoice = { ...(this.invoice() || {}) };
        if (!currentInvoice.items) {
          currentInvoice.items = [];
        }
      currentInvoice.items.splice(index, 1);
      this.invoice.set(currentInvoice);
      this.buildForm(currentInvoice);
    } 




















  saveDetail(): void {
    const currentInvoice = this.invoice();
    let valid = true;
Object.keys(this.editForm.controls).forEach(key => {
  const controlErrors = this.editForm.get(key)?.errors;
  if (controlErrors != null) {
    valid = false;
    this.showSnackbar('field ' + key + ' is required');    
  }
});    
    
    if (currentInvoice && valid) {
      // currentInvoice.grandTotal = this.grandTotal();
      // currentInvoice.totalCost = this.subTotal();
      // currentInvoice.vat = this.vat();
      // currentInvoice.orders = [];

      // for (
      //   let t = 0;
      //   t < (<UntypedFormArray>this.addForm.get('item')).length;
      //   t++
      // ) {
      //   const o: order = new order();
      //   o.itemName = this.addForm.get('item')?.value[t].itemName;
      //   o.unitPrice = this.addForm.get('item')?.value[t].itemCost;
      //   o.units = this.addForm.get('item')?.value[t].itemSold;
      //   o.unitTotalPrice = o.units * o.unitPrice;
      //   currentInvoice.orders.push(o);
      // }
      this.dialog.open(OkDialogComponent);
      // this.orderService.updateInvoice(currentInvoice.id, currentInvoice);
     // this.router.navigate(['/apps/invoice']);
      this.showSnackbar('Invoice updated  successfully!');
    }
  }

  showSnackbar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}
