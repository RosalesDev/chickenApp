import { Component, effect } from '@angular/core';
import { ProductService } from '../../../services/product.service';

@Component({
  selector: 'app-product-list',
  imports: [],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent {
  products: any[] = [];

  constructor(private productService: ProductService) {
    // Actualiza la lista de productos cuando cambie la signal
    // effect(() => {
    //   this.products = this.productService.getProductByBarcode('123456').then(products => products); // Código de barras de prueba
    // });
  }
}
