import { Component, Directive, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ProductService } from '../../../../services/product.service';
import { Product } from '../../../../../../core/models/product-model';
import { ProductDto } from '../../../../../../core/dtos/ProductDto';

@Component({
  selector: 'app-create-product-form',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-product-form.component.html',
  styleUrl: './create-product-form.component.css',
})
export class CreateProductFormComponent {
  @Input() showProductForm: boolean = false;
  productService = inject(ProductService);
  products: Product[] = [];
  form: FormGroup;

  constructor() {
    this.form = new FormGroup({
      codeType: new FormControl('barcode', [Validators.required]),
      barcode: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^[0-9]/),
      ]),
      pluCode: new FormControl('', [
        Validators.required,
        Validators.pattern(/^[0-9]{5}$/),
      ]),
      // initials: new FormControl('', [Validators.required]),
      // is_weighed: new FormControl(false, [Validators.required]),
      name: new FormControl('', [Validators.required]),
      availability_in_deposit: new FormControl('', [
        Validators.required,
        Validators.pattern(/^(?:0|[1-9]\d*)(?:[.,]\d+)?$/),
      ]),
      price_by_unit: new FormControl('', [
        Validators.required,
        Validators.pattern(/^(?:0|[1-9]\d*)(?:[.,]\d+)?$/),
      ]),
      price_by_kg: new FormControl('', [
        Validators.required,
        Validators.pattern(/^(?:0|[1-9]\d*)(?:[.,]\d+)?$/),
      ]),
    });
  }

  ngOnInit(): void {
    console.log('Se ejecuta el ngOnInit');

    this.form.get('pluCode')?.valueChanges.subscribe((value: string) => {
      const regex = /^\d+$/;
      if (!regex.test(value) && value.length > 0) {
        this.form.get('pluCode')?.setValue(value.slice(0, value.length - 1)),
          { emitEvent: false };
      }
      if (value.length > 5) {
        this.form.get('pluCode')?.setValue(value.slice(0, 5)),
          { emitEvent: false };
      }
    });
    this.form.get('barcode')?.valueChanges.subscribe((value: string) => {
      const regex = /^\d+$/;
      if (!regex.test(value) && value.length > 0) {
        this.form.get('barcode')?.setValue(value.slice(0, value.length - 1)),
          { emitEvent: false };
      }
    });

    this.form
      .get('availability_in_deposit')
      ?.valueChanges.subscribe((value: string) => {
        const regex = /^(?:0|[1-9]\d*)(?:[.,]\d*)?$/;
        if (!regex.test(value) && value.length > 0) {
          this.form
            .get('availability_in_deposit')
            ?.setValue(value.slice(0, value.length - 1)),
            { emitEvent: false };
        }
      });
    this.form.get('price_by_unit')?.valueChanges.subscribe((value: string) => {
      const regex = /^(?:0|[1-9]\d*)(?:[.,]\d*)?$/;
      if (!regex.test(value) && value.length > 0) {
        this.form
          .get('price_by_unit')
          ?.setValue(value.slice(0, value.length - 1)),
          { emitEvent: false };
      }
    });
    this.form.get('price_by_kg')?.valueChanges.subscribe((value: string) => {
      const regex = /^(?:0|[1-9]\d*)(?:[.,]\d*)?$/;
      if (!regex.test(value) && value.length > 0) {
        this.form
          .get('price_by_kg')
          ?.setValue(value.slice(0, value.length - 1)),
          { emitEvent: false };
      }
    });

    this.form.get('pluCode')?.disable();

    this.form.get('codeType')?.valueChanges.subscribe((value) => {
      this.form.get('name')?.reset();
      this.form.get('availability_in_deposit')?.reset();
      this.form.get('price_by_unit')?.reset();
      this.form.get('price_by_kg')?.reset();
      if (value === 'pluCode') {
        this.form.get('barcode')?.reset();
        this.form.get('barcode')?.disable();
        if (this.form.get('pluCode')?.disabled) {
          this.form.get('pluCode')?.enable();
        }
      } else {
        this.form.get('pluCode')?.reset();
        this.form.get('pluCode')?.disable();
        if (this.form.get('barcode')?.disabled) {
          this.form.get('barcode')?.enable();
        }
      }
    });
  }

  logInvalidFields() {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control?.invalid) {
        console.log(`El campo "${key}" es inválido. Errores:`, control.errors);
      }
    });
  }

  async createProduct(): Promise<void> {
    console.log('Entra a crear prod.');
    console.log(this.form);
    this.logInvalidFields();

    if (this.form.valid) {
      const newProduct: ProductDto = new ProductDto();
      newProduct.barcode = this.form.get('barcode')?.value ?? null;
      await this.productService.createProduct(newProduct.toProduct(''));
      // this.products.push(newProduct);
      this.closeProductForm;
    }
  }

  closeProductForm(): void {
    this.showProductForm = false;
  }
}
function checkCodeTypeValue(value: any, string: any) {
  throw new Error('Function not implemented.');
}
