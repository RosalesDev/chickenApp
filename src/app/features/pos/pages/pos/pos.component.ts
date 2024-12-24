import { Component, effect, inject, signal } from '@angular/core';
import { ProductService } from '../../services/product.service';
import { CurrencyPipe } from '@angular/common';
import { Product } from '../../../../core/models/product-model';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';
import { trigger, style, animate, transition } from '@angular/animations';
import { ModalSpinnerComponent } from './components/modal-spinner/modal-spinner.component';
import { Sale } from '../../../../core/models/sale-model';

@Component({
  selector: 'app-pos',
  imports: [CurrencyPipe, ModalSpinnerComponent],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css',
  animations: [
    trigger('fadeOutAnimation', [
      transition(':leave', [
        animate(
          '300ms ease-out',
          style({
            opacity: 0,
            transform: 'translateX(-100%)',
          })
        ),
      ]),
    ]),
    trigger('quantityAnimation', [
      transition('* => *', [
        style({ scale: 1.3, color: '#4CAF50' }),
        animate('300ms ease-out', style({ scale: 1, color: '*' })),
      ]),
    ]),
  ],
})
export class PosComponent {
  scannedProducts = signal<Product[]>([]); // Lista de productos escaneados
  subtotal = signal<number>(0); // Subtotal calculado
  private productService = inject(ProductService); // Inyecta el servicio
  newSale = signal<Sale>(new Sale()); // Venta actual

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
  ngOnInit(): void {
    document.getElementById('barcode-input')?.focus();
  }
  //TODO: Hacer que la venta se genere despues de que presionen el boton de finalizar venta.
  private updateCurrentSale(): void {
    this.newSale.update((sale: Sale) => {
      sale.productsList = this.scannedProducts();
      sale.subtotal = this.scannedProducts().reduce(
        (sum, product) => sum + product.price_by_unit! * product.quantity,
        0
      );
      sale.dateModified = new Date();
      return sale;
    });
  }

  async scanProduct(barcode: string): Promise<void> {
    this.showModal(); // Muestra el modal
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
      this.updateCurrentSale(); // Actualiza la venta
      this.hideModal(); // Oculta el modal
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
      this.updateCurrentSale(); // Actualiza la venta
      this.hideModal(); // Oculta el modal
    }
  }

  clearCart(): void {
    this.scannedProducts.set([]); // Limpia los productos
    this.subtotal.set(0); // Reinicia el subtotal
  }

  removeProduct(productId: string): void {
    this.scannedProducts.update((products) =>
      products
        .map((product) => {
          if (product.id === productId) {
            // Si la cantidad es mayor a 1, reducimos en 1
            if (product.quantity > 1) {
              return { ...product, quantity: product.quantity - 1 };
            }
            // Si la cantidad es 1, no incluimos el producto (lo eliminamos)
            return null;
          }
          return product;
        })
        .filter((product): product is Product => product !== null)
    );
  }

  private showModal(): void {
    const modalElement = document.getElementById('loadingModal');
    if (modalElement) {
      modalElement.classList.add('show'); // Agrega la clase 'show'
      modalElement.style.display = 'block'; // Muestra el modal
      document.body.classList.add('modal-open'); // Evita el scroll en el fondo
    }
  }

  private hideModal(): void {
    const modalElement = document.getElementById('loadingModal');
    if (modalElement) {
      modalElement.classList.remove('show'); // Quita la clase 'show'
      modalElement.style.display = 'none'; // Oculta el modal
      document.body.classList.remove('modal-open'); // Restaura el scroll
    }
  }

  finalizeSale(): void {
    console.log(this.newSale());
  }
}
