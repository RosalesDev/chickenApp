import { Component, inject, Input, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ProductService } from '../../../../services/product.service';
import { Product } from '../../../../../../core/models/product-model';

@Component({
  selector: 'app-create-product-form',
  imports: [ReactiveFormsModule],
  templateUrl: './create-product-form.component.html',
  styleUrl: './create-product-form.component.css',
})
export class CreateProductFormComponent {
  ngOnInit(): void {
    document.getElementById('barcode')?.focus();
  }

  @Input() showProductForm: boolean = false;
  form = signal<FormGroup>(
    new FormGroup({
      barcode: new FormControl('', [Validators.required]),
      initials: new FormControl('', [Validators.required]),
      is_weighed: new FormControl(false, [Validators.required]),
      name: new FormControl('', [Validators.required]),
      availability_in_deposit: new FormControl(0, [Validators.required]),
      price_by_unit: new FormControl(0, [Validators.required]),
      price_by_kg: new FormControl(0, [Validators.required]),
    })
  );
  productService = inject(ProductService);
  products: Product[] = [];

  async createProduct(): Promise<void> {
    console.log(this.form()['controls']['barcode'].value);
    if (this.form().valid) {
      const newProduct: Product = this.form().value;
      await this.productService.createProduct(newProduct);
      this.products.push(newProduct);
      this.closeProductForm();
    }
  }

  closeProductForm(): void {
    this.showProductForm = false;
  }
}
