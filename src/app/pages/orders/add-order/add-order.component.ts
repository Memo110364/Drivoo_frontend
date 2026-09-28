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
  FormArray,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {OkDialogComponent} from './ok-dialog/ok-dialog.component';
import {MaterialModule} from 'src/app/material.module';
import {CommonModule} from '@angular/common';
import {TablerIconsModule} from 'angular-tabler-icons';
import {MatSnackBar} from '@angular/material/snack-bar';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material/chips';
@Component({
  selector: 'app-add-invoice',
  styleUrl: './add-order.component.scss',
  templateUrl: './add-order.component.html',
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
export class AddOrderComponent implements OnInit{
  id = signal<any>(null);
  addForm!: FormGroup;

  cities = signal<any[]>([]);
  areas = signal<any[]>([]);
  subTotal = signal<number>(0);
  currentDate :Date= new Date();
  grandTotal = signal<number>(0);
  invoice = signal<OrderFullDetails | any>(null);
  areaList: { [key: string]: any[] } = {};

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  phoneNumbers: string[] = [];
  readonly phoneRegex = /^(?:\+2|002)?01[0125]\d{8}$/;

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
    this.buildForm();
    this.loadData();
  }

  get items(): FormArray {
    return this.addForm?.get('items') as FormArray;
  }

  phoneListValidator(control: AbstractControl): ValidationErrors | null {
    if (!this.phoneNumbers || this.phoneNumbers.length === 0) {
      return { required: true };
    }
    const allValid = this.phoneNumbers.every((p) => this.phoneRegex.test(p));
    return allValid ? null : { invalidPhone: true };
  }

  addPhone(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      const numbers = value.split(/[\s,]+/).map((p) => p.trim()).filter((p) => p.length > 0);
      const invalidNumbers: string[] = [];

      for (const phone of numbers) {
        if (this.phoneRegex.test(phone)) {
          if (!this.phoneNumbers.includes(phone)) {
            this.phoneNumbers.push(phone);
          }
        } else {
          invalidNumbers.push(phone);
        }
      }

      this.updatePhoneControl();

      if (invalidNumbers.length > 0) {
        this.showSnackbar('Please enter valid phone number');
        if (event.chipInput && event.chipInput.inputElement) {
          event.chipInput.inputElement.value = invalidNumbers.join(', ');
        }
      } else {
        if (event.chipInput) {
          event.chipInput.clear();
        }
      }
    }
  }

  removePhone(phone: string): void {
    const index = this.phoneNumbers.indexOf(phone);
    if (index >= 0) {
      this.phoneNumbers.splice(index, 1);
      this.updatePhoneControl();
    }
  }

  updatePhoneControl(): void {
    const phoneCtrl = this.addForm?.get('phone');
    if (phoneCtrl) {
      const phoneVal = this.phoneNumbers.length > 0 ? this.phoneNumbers.join(', ') : '';
      phoneCtrl.setValue(phoneVal);
      phoneCtrl.updateValueAndValidity();
      phoneCtrl.markAsTouched();
    }
  }

  updateTotals(): void {
    let subTotal = 0;
    if (this.items) {
      this.items.controls.forEach((control: AbstractControl) => {
        const cost = Number(control.get('itemCost')?.value) || 0;
        const qty = Number(control.get('itemQty')?.value) || 0;
        subTotal += cost * qty;
      });
    }
    this.grandTotal.set(subTotal);
  }

  loadData(): void {
    forkJoin({
      citiesRes: this.logisticsService.getCities()
    }).subscribe({
      next: ({ citiesRes }) => {
        const citiesList = citiesRes?.data || [];
        this.cities.set(citiesList);
        for (const city of citiesList) {
          this.areaList[city.id] = city.areas || [];
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

  createItemGroup(item: any): FormGroup {
    const cost = item.rate ?? item.cost ?? 0;
    const qty = item.quantity ?? item.sold ?? 1;
    const group = this.fb.group({
      item_id: [item.id || null, Validators.nullValidator],
      itemName: [item.product_name || item.name || '', Validators.required],
      itemImage: [item.image || '', Validators.nullValidator],
      itemOption: [item.option || '', Validators.required],
      itemCost: [cost, [Validators.required, Validators.min(0)]],
      itemQty: [qty, [Validators.required, Validators.min(1)]],
      itemTotal: [{ value: cost * qty, disabled: true }]
    });

    group.valueChanges.subscribe(() => {
      this.updateTotals();
    });

    return group;
  }

  buildForm() {
    this.phoneNumbers = [];

    this.addForm = this.fb.group({
      name: ['', Validators.required],
      phone: [
        '',
        [Validators.required, this.phoneListValidator.bind(this)]
      ],
      city_id: ['', Validators.required],
      area_id: ['', Validators.required],
      address: ['', Validators.required],
      items: this.fb.array([], [Validators.required, Validators.minLength(1)]),
      notes: ['', Validators.nullValidator],
      deletedItems: [[]]
    });

    this.updateTotals();

    this.addForm.get('items')?.valueChanges.subscribe(() => {
      this.updateTotals();
    });
    this.addForm.get('city_id')?.valueChanges.subscribe((newCityId) => {
      this.onCityChange(newCityId);
    });
  }

  onCityChange(cityId: any): void {
    this.areas.set(this.getAreasForCity(cityId));
    this.addForm.get('area_id')?.setValue(null);
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

  addItem(): void {
    const dialogRef = this.dialog.open(ListProductComponent, {
      width: '90%',
      maxWidth: '95vw',
      maxHeight: '95vh',
      height: '90%',
      data: {
        items: []
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {      
      if (result) {
        let optionValue = '';
        if (result.selectedOptions) {
          const optionsArray = Object.values(result.selectedOptions);
          optionValue = optionsArray.map((opt: any) => opt.value).join(' - ');
        } 
        const newItem = {
          id: null,
          product_name: result.product_name || result.name || result.product?.product_name || '',
          image: result.product?.image || result.image || '',
          quantity: result.quantity ?? 1,
          option: optionValue || '',
          status: "PENDING",
          status_code: 1,
          rate: result.rate ?? result.cost ?? result.product?.rate ?? 0,
          commission: 0,
          price_effect: 0,
          bonus: 0,
          amount: 0
        };

        this.items.push(this.createItemGroup(newItem));
        this.updateTotals();
      }
    });
  }

  onQuantityChange(event: any, index: number): void {
    this.updateTotals();
  }

  removeRow(index: number): void {
    if (this.items && this.items.length > index) {
      this.items.removeAt(index);
      this.updateTotals();
    }
  }

  saveDetail(): void {
    this.updatePhoneControl();
    this.addForm.markAllAsTouched();
    
    let valid = true;    
    Object.keys(this.addForm.controls).forEach((key) => {
      const controlErrors = this.addForm.get(key)?.errors;
      if (controlErrors != null) {
        valid = false;
        this.showSnackbar('field ' + key + ' is required');
      }
    });

    if (this.items.length === 0) {
      valid = false;
      this.showSnackbar('Please add at least one item');
      return;
    }

    if (valid && this.addForm.valid) {
      const formVal = this.addForm.getRawValue();
      const payload: any = {
        name: formVal.name,
        phone: this.phoneNumbers.join(', '),
        city_id: formVal.city_id,
        area_id: formVal.area_id,
        address: formVal.address,
        notes: formVal.notes || '',
        items: formVal.items.map((it: any) => ({
          product_name: it.itemName,
          image: it.itemImage,
          option: it.itemOption,
          rate: it.itemCost,
          quantity: it.itemQty,
          status: "PENDING",
          status_code: 1
        }))
      };

      this.orderService.createInvoice(payload).subscribe({
        next: (res) => {
          if (res?.status == 201 || res?.data) {
            this.showSnackbar('Invoice created successfully!');
            const newId = res?.data?.id || res?.id;
            if (newId) {
              this.router.navigate(['/orders/view/', newId]);
            } else {
              this.router.navigate(['/orders']);
            }
          } else {
            this.showSnackbar('Error creating invoice');
          }
        },
        error: (err) => {
          console.error('Error creating order:', err);
          this.showSnackbar('Error creating order');
        }
      });      
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
