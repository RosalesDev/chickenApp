import { Component, effect, inject, signal } from '@angular/core';
import { ProductService } from '../../../services/product.service';
import { CurrencyPipe } from '@angular/common';
import { Product } from '../../../../../core/models/product-model';

@Component({
  selector: 'app-pos',
  imports: [CurrencyPipe],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css',
})
export class PosComponent {
  scannedProducts = signal<Product[]>([]); // Lista de productos escaneados
  subtotal = signal<number>(0); // Subtotal calculado
  private productService = inject(ProductService); // Inyecta el servicio

  constructor() {
    // Recalcular el subtotal automáticamente cuando cambie la lista de productos
    effect(() => {
      const total = this.scannedProducts().reduce(
        (sum, product) => sum + product.price_by_unit! * product.quantity,
        0
      );
      this.subtotal.set(total);
    });
  }

  async scanProduct(barcode: string): Promise<void> {
    const existingProduct = this.scannedProducts().find(
      (product) => product.barcode === barcode
    );

    if (existingProduct) {
      // Incrementa la cantidad si el producto ya existe en la lista
      existingProduct.quantity++;
      this.scannedProducts.update((products) =>
        products.map((product) =>
          product.barcode === barcode ? existingProduct : product
        )
      );
    } else {
      // Busca el producto en la base de datos
      const product = await this.productService.getProductByBarcode(barcode);
      if (product().length > 0) {
        const newProduct = {
          ...product()[0], // Información del producto
          quantity: 1, // Inicializa la cantidad en 1
        };
        this.scannedProducts.update((products) => [...products, newProduct]);
      }
    }
  }

  clearCart(): void {
    this.scannedProducts.set([]); // Limpia los productos
    this.subtotal.set(0); // Reinicia el subtotal
  }
}
