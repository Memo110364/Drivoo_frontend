import {Component, signal ,OnInit ,AfterViewInit } from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {OrderService} from 'src/app/services/apps/order/order.service';
import {LogisticsService} from 'src/app/services/api/logistics.service'
import {OrderFullDetails, OrderList} from '../order-objects';
import {TranslateModule} from '@ngx-translate/core';
import {forkJoin} from 'rxjs';
import {ListProductComponent} from 'src/app/components/dialog/product/list-product/list-product.component';
import {
  UntypedFormGroup,
  UntypedFormArray,
  UntypedFormBuilder,
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
  addForm: UntypedFormGroup | any;
  invoice = signal<OrderFullDetails | any>(null);
  areaList: { [key: string]: any[] } = {};

  constructor(
    activatedRouter: ActivatedRoute,
    private orderService: OrderService,
    private logisticsService: LogisticsService,
    private router: Router,
    private fb: UntypedFormBuilder,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    public translate: TranslateModule
  ) {
    this.id.set(activatedRouter.snapshot.paramMap.get('id'));
    
    this.addForm = this.fb.group({
      item: this.fb.array([this.itemControl()]),
    });

    this.fillAddControls();
  }

  ngOnInit(): void {
    this.loadData();
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

  loadInvoice(): void {
    this.orderService.getOrderById(this.id()).subscribe((res) => {
      this.invoice.set(res.data);
      this.buildForm(res.data);
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

    this.editForm = this.fb.group({
      name: [invoice.Name || invoice.name || '', Validators.required],
      phone: [invoice.Phone || invoice.phone || '', Validators.required],
      city_id: [cityId ? cityId.toString() : '', Validators.required],
      area_id: [areaId ? areaId.toString() : '', Validators.required],
      address: [invoice.Address || invoice.address || '', Validators.required],
      items: this.fb.array(
        (invoice.items || []).map((item: any) =>
          this.fb.group({
            itemName: [item.product_name || item.name || '', Validators.required],
            itemCost: [item.rate ?? item.cost ?? 0, Validators.required],
            itemSold: [item.quantity ?? item.sold ?? 0, Validators.required],
            itemTotal: [{ value: (item.rate ?? item.cost ?? 0) * (item.quantity ?? item.sold ?? 0), disabled: true }]
          })
        )
      )
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
      height: '90vh',
      // scrollStrategy
      data: {
        items: this.invoice()?.orders
      }
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.invoice.set(result);
        this.buildForm(result);
      }
    });
  
  }
























  itemControl(): UntypedFormGroup {
    return this.fb.group({
      itemName: ['', Validators.required],
      itemCost: ['', Validators.required],
      itemSold: ['', Validators.required],
      itemTotal: [{value: 0, disabled: true}]
    });
  }

  fillAddControls(): void {
    // this.addForm.setControl('item', this.setItem(this.invoice()?.orders));
  }

  setItem(order: any): UntypedFormArray {
    const fa = new UntypedFormArray([]);
    order?.forEach((s: any) => {
      fa.push(
        this.fb.group({
          itemName: s.itemName,
          itemCost: s.unitPrice,
          itemSold: s.units,
          itemTotal: s.unitTotalPrice,
        })
      );
    });
    return fa;
  }

  btnAddItemClick(): void {
    (<UntypedFormArray>this.addForm.get('item')).push(this.itemControl());
  }

  btnRemoveClick(i: number): void {
    const totalCostOfItem =
      this.addForm.get('item')?.value[i].itemCost *
      this.addForm.get('item')?.value[i].itemSold;

    this.subTotal.set(this.subTotal() - totalCostOfItem);
    this.vat.set(this.subTotal() / 10);
    this.grandTotal.set(this.subTotal() + this.vat());

    (<UntypedFormArray>this.addForm.get('item')).removeAt(i);
  }

  itemsChanged(): void {
    let total = 0;
    for (
      let t = 0;
      t < (<UntypedFormArray>this.addForm.get('item')).length;
      t++
    ) {
      if (
        this.addForm.get('item')?.value[t].itemCost != '' &&
        this.addForm.get('item')?.value[t].itemSold
      ) {
        total +=
          this.addForm.get('item')?.value[t].itemCost *
          this.addForm.get('item')?.value[t].itemSold;
      }
    }
    this.subTotal.set(total);
    this.vat.set(this.subTotal() / 10);
    this.grandTotal.set(this.subTotal() + this.vat());
  }

  saveDetail(): void {
    const currentInvoice = this.invoice();
    if (currentInvoice) {
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
      this.router.navigate(['/apps/invoice']);
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
