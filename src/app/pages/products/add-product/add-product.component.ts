import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { IconModule } from 'src/app/icon/icon.module';
import { MaterialModule } from 'src/app/material.module';

import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Router } from '@angular/router';
import { ProductService } from 'src/app/services/apps/product/product.service';
import { debounceTime } from 'rxjs';
import { NgxDropzoneModule } from 'ngx-dropzone';
import { PRODUCT_DATA } from '../list-product/ecommerceData';
import {
  NgxEditorComponent,
  NgxEditorMenuComponent,
  Editor,
  Toolbar,
} from 'ngx-editor';
import { TablerIconsModule } from 'angular-tabler-icons';
import {MatSnackBar} from '@angular/material/snack-bar';
import { MediaService } from '../../../services/api/media.service';
@Component({
  selector: 'app-add-product',
  imports: [
    MaterialModule,
    IconModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgxDropzoneModule,
    NgxEditorComponent,
    NgxEditorMenuComponent,
    TablerIconsModule,
  ],
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.scss',
})
export class AddProductComponent implements OnInit {
  private router = inject(Router);
  private productService = inject(ProductService);
  private fb = inject(FormBuilder);
  private mediaService = inject(MediaService);
  html = '';
  editor: Editor;
  htmlContent1 = '';
  toolbar: Toolbar = [
    ['bold', 'italic'],
    ['underline'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['link', 'image'],
    ['text_color', 'background_color'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
  ];

  files: File[] = [];
  seasons: string[] = ['No Discount', 'Percentage %', 'Fixed Price'];
  sizes: string[] = ['XS', 'S', 'M', 'L', 'XL'];

  taxClasses: string[] = [
    'Select an option',
    'Tax Free',
    'Taxable Goods',
    'Downloadable Products',
  ];
  categories: string[] = [
    'Computer',
    'Watches',
    'Headphones',
    'Beauty',
    'Fashion',
    'Footwear',
  ];
  templates: string[] = [
    'Default template',
    'Fashion',
    'Office Stationary',
    'Electronics',
  ];

  productStatuses = [
    { label: 'Stock', value: true },
    { label: 'Out of stock', value: false },
  ];
  selectedOption: string = '';
  tags: string[] = []; // Selected tags
  allTags: string[] = ['electronics', 'books', 'clothing', 'music']; // Suggestions
  AddProduct!: FormGroup;

  product: any;
  isEditMode: boolean = false;
  constructor( private snackBar: MatSnackBar) {
    this.AddProduct = this.fb.group({
      id: [null],
      product_name: ['', Validators.required],
      description: [''],
      size: [''],
      variations: [''],
      base_price: [''],

      discount_type: ['No Discount'],
      set_discount_percentage: [''],
      fixed_discounted_price: [''],
      tax_class: [''],
      VAT_amount: [''],
      status: [''],
      categories: [''],
      default_template: [''],
      tags: this.fb.array([]),
      variables: this.fb.array([]),

      media: this.fb.array([]),
      Thumbnail: this.fb.array([]),
    });

    
  }

  get variables(): FormArray {
    return this.AddProduct.get('variables') as FormArray;
  }

  createValueGroup(name: string = '', value: string = ''): FormGroup {
    return this.fb.group({
      name: [name, Validators.required],
      value: [value]
    });
  }

  addVariable(name: string = '', type: string = 'text') {
    const defaultVal = type === 'color' ? '#16cdc7' : '';
    const variableGroup = this.fb.group({
      name: [name, Validators.required],
      type: [type, Validators.required],
      values: this.fb.array([
        this.createValueGroup('', defaultVal)
      ])
    });
    this.variables.push(variableGroup);
  }

  removeVariable(variableIndex: number) {
    this.variables.removeAt(variableIndex);
  }

  getValues(variableIndex: number): FormArray {
    return this.variables.at(variableIndex).get('values') as FormArray;
  }

  addValue(variableIndex: number) {
    const varType = this.variables.at(variableIndex).get('type')?.value || 'text';
    const defaultValue = varType === 'color' ? '#16cdc7' : '';
    this.getValues(variableIndex).push(this.createValueGroup('', defaultValue));
  }

  removeValue(variableIndex: number, valueIndex: number) {
    const values = this.getValues(variableIndex);
    values.removeAt(valueIndex);
  }

  onVariableTypeChange(variableIndex: number) {
    const varGroup = this.variables.at(variableIndex);
    const newType = varGroup.get('type')?.value;
    const values = this.getValues(variableIndex);
    if (newType === 'color') {
      values.controls.forEach((ctrl) => {
        const currentVal = ctrl.get('value')?.value;
        if (!currentVal || !String(currentVal).startsWith('#')) {
          ctrl.get('value')?.setValue('#16cdc7');
        }
      });
    }
  }

  onValueImageUpload(event: any, variableIndex: number, valueIndex: number) {
    const file = event.target.files?.[0];
    console.log(file);
    if (file) {
      this.mediaService.upload(file).subscribe((res: any) => {
        const valGroup = this.getValues(variableIndex).at(valueIndex);
        valGroup.get('value')?.setValue(res.data.url);
        this.snackBar.open('Image uploaded successfully', 'Close', {
          duration: 2000,
        });
      });
    }
  }



  get isFormValid() {
    return this.AddProduct.valid;
  }

  get mediaArray() {
    return this.AddProduct.get('media') as FormArray;
  }
  get sizeControl() {
    return this.AddProduct.get('size');
  }
  get Thumbnail(): FormArray {
    return this.AddProduct.get('Thumbnail') as FormArray;
  }
  get tagsArray(): FormArray {
    return this.AddProduct.get('tags') as FormArray;
  }
  ngOnInit(): void {
    this.editor = new Editor();

    const currentUrl = this.router.url;

    if (currentUrl.includes('edit-product')) {
      const product = this.productService.getProduct();
      if (product) {
        // Case: Navigate via button with selected product
        this.isEditMode = true;
        this.populateForm(product);
      } else {
        // Case: Direct navigation to /edit-product with no data
        this.isEditMode = true;
        this.populateForm(PRODUCT_DATA[0]); // fallback product
      }

      this.productService.clearProduct(); // cleanup
    } else if (currentUrl.includes('add-product')) {
      // Case: Add mode
      this.isEditMode = false;
      this.populateForm({}); // empty form
    }
  }
  ngOnDestroy() {
    this.editor.destroy();
    // Optional: Clear product data when leaving the component
    this.productService.clearProduct();
  }

  onChange(event: any) {
    console.log('changed');
  }

  onBlur(event: any) {
    console.log('blur ' + event);
  }
  onSelect(event: any) {
    console.log(event);
    const files = event.addedFiles; // Getting the selected files
    
    // Loop through the selected files and add them to the FormArray
    files.forEach((file: any) => {
      this.mediaArray.push(this.fb.control(file)); // Add file to FormArray
    });
  }

  // Method to remove file
  onRemove(file: any, index?: any) {
    index = this.mediaArray.controls.findIndex(
      (control) => control.value === file
    );
    if (index > -1) {
      this.mediaArray.removeAt(index); // Remove file from FormArray
    }
  }
  onSeasonChange(event: any) {
    this.selectedOption = event.value;
  }
  selectTag(tag: string) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  addTagFromInput(event: any) {
    const input = event.input;
    const value = event.value?.trim();

    if (value && !this.tags.includes(value)) {
      this.tags.push(value);
    }

    if (input) input.value = '';
  }

  removeTag(tag: string) {
    this.tags = this.tags.filter((t) => t !== tag);
  }
  getBack() {
    this.router.navigate(['apps/product/product-list']);
  }
  getAddProduct(data: any) {
    const formData = this.AddProduct.getRawValue();
    const imageFilename = formData.media[0]; // e.g., "Spike Nextjs Free.jpg"
    
    // Store the image filename in localStorage (as a string)
    localStorage.setItem('productImage', imageFilename);
    if (this.isEditMode) {
      if (!formData.id) {
        console.error('Updated product does not have an id:', formData); // Log if id is missing
      }
      this.updateProduct(formData); // Pass formData which should have id
    } else {
      this.addProduct(formData); // Handle adding a new product (no id for new product)
    }
  }

  addProduct(data: any) {
    
    if (this.AddProduct.valid) {
      // Extract plain text from ngx-editor content
      if (data.description?.content?.length) {
        data.description = this.extractPlainText(data.description);
      } else {
        data.description = '';
      }

      // Handle media
      if (data.media && data.media.length > 0) {
        data.media = data.media.map((file: any) => file.name);
      } else {
        data.media = [];
      }

      // Clean up unnecessary fields
      delete data.size;
      delete data.Thumbnail;
      delete data.VAT_amount;
      delete data.default_template;
      delete data.fixed_discounted_price;
      delete data.tags;
      delete data.tax_class;
      delete data.variations;
      delete data.set_discount_percentage;
      delete data.discount_type;
      console.log(data);
      
      // this.productService.emitProduct(data);
      // this.getBack();
    }
    else{
      const errors = this.checkFormErrors(this.AddProduct); 
      //to show the errors in snack bar 
      errors.forEach((error: any) => {
        this.showSnackbar(error.field + ' is required');
      });
    }
  }
  extractPlainText(doc: any): string {
    let text = '';

    if (!doc?.content) return text;

    doc.content.forEach((node: any) => {
      if (node.content) {
        node.content.forEach((child: any) => {
          if (child.text) {
            text += child.text + ' ';
          }
        });
      }
    });

    return text.trim();
  }

  populateForm(product: any) {
    this.AddProduct.patchValue({
      id: product.id,
      product_name: product.product_name || product.title || '',
      category: product.category,
      base_price: product.base_price || product.price || '',
      status: product.status,
      description: product.description,
      imagePath: product.imagePath,
    });
  }
  updateProduct(data: any) {
    if (this.AddProduct.valid) {
      if (data.media && data.media.length > 0) {
        data.media = data.media.map((file: any) => file.name);
      } else {
        data.media = [];
      }

      // clean up unnecessary fields
      delete data.size;
      delete data.Thumbnail;
      delete data.VAT_amount;
      delete data.default_template;
      delete data.fixed_discounted_price;
      delete data.tags;
      delete data.tax_class;
      delete data.variations;
      delete data.set_discount_percentage;
      delete data.discount_type;
      this.productService.updateProduct(data); // <-- make sure you have this method in service
      this.getBack();
    }
  }
  checkFormErrors(form: FormGroup,parentKey:string = '', index?: number) {
  const errors: any[] = [];

  Object.keys(form.controls).forEach(key => {
    const control = form.get(key);
    
    if (control instanceof FormGroup) {
      // لو كنترول عبارة عن FormGroup داخلي
      errors.push(...this.checkFormErrors(control, parentKey+key, index));
    } else if (control instanceof FormArray) {
      // لو كنترول عبارة عن FormArray
      control.controls.forEach((arrayControl, index) => {
        if (arrayControl instanceof FormGroup) {
          errors.push(...this.checkFormErrors(arrayControl, parentKey!=''?parentKey+'.'+key:key, index));
        } else if (arrayControl.errors) {
          errors.push({
            field: `${parentKey!=''?parentKey+'.'+key:key}[${index}]`,
            errors: arrayControl.errors
          });
        }
      });
    } else if (control?.errors) {
      // لو كنترول عادي فيه أخطاء
      errors.push({
        field: parentKey!=''?parentKey+'.'+key:key,
        errors: control.errors
      });
    }
  });

  return errors;
}
showSnackbar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}
