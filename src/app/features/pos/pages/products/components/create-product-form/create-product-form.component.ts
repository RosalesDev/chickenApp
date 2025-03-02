import { Component, Directive, inject, Input, signal } from '@angular/core';
import {
  AbstractControl,
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
  imports: [ReactiveFormsModule],
  templateUrl: './create-product-form.component.html',
  styleUrl: './create-product-form.component.css',
})
export class CreateProductFormComponent {
  @Input() showProductForm: boolean = false;
  productService = inject(ProductService);
  products: Product[] = [];
  form!: FormGroup;

  ngOnInit(): void {
    this.form = new FormGroup({
      codeType: new FormControl('barcode', [Validators.required]),
      barcode: new FormControl('', [Validators.required]),
      pluCode: new FormControl(
        '',
        Validators.pattern(new RegExp('^[0-9]{4}$'))
      ),
      // initials: new FormControl('', [Validators.required]),
      // is_weighed: new FormControl(false, [Validators.required]),
      name: new FormControl('', [Validators.required]),
      availability_in_deposit: new FormControl('', [Validators.required]),
      price_by_unit: new FormControl('', [Validators.required]),
      price_by_kg: new FormControl('', [Validators.required]),
    });
    document.getElementById('barcode')?.focus();
    this.form.get('codeType')?.valueChanges.subscribe((value) => {
      if (value?.toString() === 'pluCode') {
        this.form.controls['pluCode'].setValidators([Validators.required]);
        this.form.controls['barcode'].clearValidators();
      } else {
        this.form.controls['barcode'].setValidators([Validators.required]);
        this.form.controls['pluCode'].clearValidators();
      }
      this.form.controls['pluCode'].updateValueAndValidity();
      this.form.controls['barcode'].updateValueAndValidity();
      console.log('PLU valid?:', this.form.get('pluCode')?.valid);
      console.log('BARCODE valid?:', this.form.get('barcode')?.valid);
    });
  }

  // codeType = signal<string>('barcode');

  // get pluCode() {
  //   console.log('Llamando a pluCode');
  //   return this.form.get('pluCode');
  // }
  // get barcode() {
  //   console.log('Llamando a barcode');
  //   return this.form.get('barcode');
  // }

  // get codeTypeValue() {
  //   return this.form.get('codeType')?.value;
  // }

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

  // onCodeTypeChange(value: string) {
  //   this.codeType.set(value);
  //   // this.updateValidators();
  // }
}
