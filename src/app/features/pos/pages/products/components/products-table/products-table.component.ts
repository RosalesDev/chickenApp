import { Component, inject, Input } from '@angular/core';
import { Product } from '../../../../../../core/models/product-model';
import { ProductService } from '../../../../services/product.service';

@Component({
  selector: 'app-products-table',
  imports: [],
  templateUrl: './products-table.component.html',
  styleUrl: './products-table.component.css',
})
export class ProductsTableComponent {
  @Input() products: Product[] = [];
  private productService = inject(ProductService);
  isAdmin = true; // Cambia esto según tu lógica de roles
  limit = 10; // Tamaño de página
  lastVisible: any;
  searchQuery = '';
  isSearching = false; // Indica si se está buscando
  isLoading = false; // Indica si se están cargando productos

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.productService
      .getProducts(this.limit, this.lastVisible)
      .then((newProducts: Product[]) => {
        this.products = [...this.products, ...newProducts];
        this.lastVisible = newProducts[newProducts.length - 1]; // Actualiza el último documento visible
        this.isLoading = false;
      });
  }
  deleteProductById(id: string): void {
    this.isLoading = true;
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      this.productService.deleteProductById(id).then(() => {
        this.products = this.products.filter((p) => p.id !== id);
      });
    }
    this.isLoading = false;
  }
}
