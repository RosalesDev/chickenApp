import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ProductService } from '../../../../services/product.service';
import { Product } from '../../../../../../core/models/product-model';

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
  fb = inject(FormBuilder);
  form: FormGroup;

  constructor() {
    console.log('Se ejecuta el constructor');
    this.form = this.fb.group({
      codeType: ['barcode', [Validators.required]],
      barcode: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.pattern(/^[0-9]/),
        ],
      ],
      pluCode: ['', [Validators.required, Validators.pattern(/^[0-9]{5}$/)]],
      initials: ['', [Validators.required]],
      is_weighed: [false, [Validators.required]],
      name: ['', [Validators.required]],
      availability_in_deposit: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?:0|[1-9]\d*)(?:[.,]\d+)?$/),
        ],
      ],
      price_by_unit: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?:0|[1-9]\d*)(?:[.,]\d+)?$/),
        ],
      ],
      price_by_kg: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?:0|[1-9]\d*)(?:[.,]\d+)?$/),
        ],
      ],
    });
  }

  ngOnInit(): void {
    console.log('Se ejecuta el ngOnInit');
    this.form.get('name')?.valueChanges.subscribe((value) => {
      this.generarIniciales(value);
    });

    this.form.get('price_by_kg')?.disable();
    this.form.get('is_weighed')?.valueChanges.subscribe((value: boolean) => {
      if (!value) {
        this.form.get('price_by_kg')?.disable();
        this.form.get('price_by_kg')?.reset();
      } else {
        this.form.get('price_by_kg')?.enable();
      }
    });

    this.form.get('pluCode')?.valueChanges.subscribe((value: string) => {
      const regex = /^\d+$/;
      if (!regex.test(value) && value?.length > 0) {
        this.form.get('pluCode')?.setValue(value.slice(0, value.length - 1)),
          { emitEvent: false };
      }
      if (value?.length > 5) {
        this.form.get('pluCode')?.setValue(value.slice(0, 5)),
          { emitEvent: false };
      }
    });
    this.form.get('barcode')?.valueChanges.subscribe((value: string) => {
      const regex = /^\d+$/;
      if (!regex.test(value) && value?.length > 0) {
        this.form.get('barcode')?.setValue(value.slice(0, value.length - 1)),
          { emitEvent: false };
      }
    });

    this.form
      .get('availability_in_deposit')
      ?.valueChanges.subscribe((value: string) => {
        const regex = /^(?:0|[1-9]\d*)(?:[.,]\d*)?$/;
        if (!regex.test(value) && value?.length > 0) {
          this.form
            .get('availability_in_deposit')
            ?.setValue(value.slice(0, value.length - 1)),
            { emitEvent: false };
        }
      });
    this.form.get('price_by_unit')?.valueChanges.subscribe((value: string) => {
      const regex = /^(?:0|[1-9]\d*)(?:[.,]\d*)?$/;
      if (!regex.test(value) && value?.length > 0) {
        this.form
          .get('price_by_unit')
          ?.setValue(value.slice(0, value?.length - 1)),
          { emitEvent: false };
      }
    });
    this.form.get('price_by_kg')?.valueChanges.subscribe((value: string) => {
      const regex = /^(?:0|[1-9]\d*)(?:[.,]\d*)?$/;
      if (!regex.test(value) && value?.length > 0) {
        this.form
          .get('price_by_kg')
          ?.setValue(value.slice(0, value?.length - 1)),
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

  generarIniciales(nombre: string) {
    if (!nombre) {
      this.form.patchValue({ initials: '' });
      return;
    }

    // Obtener las iniciales de las palabras
    const iniciales = nombre
      .split(/\s+/) // Dividir por espacios
      .map((palabra) => palabra[0]?.toUpperCase() || '') // Tomar la primera letra en mayúscula
      .join('');

    this.form.patchValue({ initials: iniciales });
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
    if (this.form.invalid) {
      this.logInvalidFields();
      alert('Formulario inválido');
      return;
    }

    await this.productService.saveProduct(
      this.productService.mapProductFormToProduct(this.form)
    );
    // this.products.push(newProduct);
    this.closeProductForm;
  }

  closeProductForm(): void {
    this.showProductForm = false;
  }
}
function checkCodeTypeValue(value: any, string: any) {
  throw new Error('Function not implemented.');
}
