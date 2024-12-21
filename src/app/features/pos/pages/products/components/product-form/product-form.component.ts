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
  selector: 'app-product-form',
  imports: [ReactiveFormsModule],
  inputs: ['showProductForm'],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css',
})
export class ProductFormComponent {
  @Input() showProductForm: boolean = false;
  form = signal<FormGroup>(
    new FormGroup({
      name: new FormControl('', [Validators.required]),
      quantity: new FormControl(0, [Validators.required]),
      price_by_unit: new FormControl(0, [Validators.required]),
      price_by_kg: new FormControl(0, [Validators.required]),
    })
  );
  productService = inject(ProductService);
  products: Product[] = [];

  async createProduct(): Promise<void> {
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
