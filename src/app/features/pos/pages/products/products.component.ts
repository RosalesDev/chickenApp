import { Component, inject, OnInit } from '@angular/core';
import { Product } from '../../../../core/models/product-model';
import { ProductService } from '../../services/product.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductFormComponent } from './components/product-form/product-form.component';

@Component({
  selector: 'app-products',
  imports: [ProductFormComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css',
})
export class ProductsComponent implements OnInit {
  private productService = inject(ProductService);
  products: Product[] = [];
  searchQuery = '';
  isAdmin = false; // Cambia esto según tu lógica de roles
  lastVisible: any;
  limit = 10; // Tamaño de página
  isSearching = false; // Indica si se está buscando
  isLoading = false; // Indica si se están cargando productos
  productForm: FormGroup;
  showProductForm = false;

  constructor(private fb: FormBuilder) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      initials: ['', Validators.required],
      quantity: [0, Validators.required],
      price_by_unit: [0, Validators.required],
      price_by_kg: [0, Validators.required],
    });
  }

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

  // Buscar productos por nombre
  async searchProducts(query: string): Promise<void> {
    if (!query) {
      // Si no hay texto de búsqueda, recarga los productos paginados
      this.isSearching = false;
      this.products = [];
      this.lastVisible = null;
      await this.loadProducts();
      return;
    }

    try {
      this.isSearching = true; // Indicar que se está buscando
      const searchResults = await this.productService.searchProductsByName(
        query
      );
      this.products = searchResults; // Mostrar solo los productos que coincidan
      this.isSearching = false;
    } catch (error) {
      console.error('Error al buscar productos:', error);
      this.isSearching = false;
    }
  }
  editProduct(product: Product) {
    this.productService.updateProduct(product.id, product);
  }

  deleteProduct(id: string): void {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      this.productService.deleteProduct(id).then(() => {
        this.products = this.products.filter((p) => p.id !== id);
      });
    }
  }

  openProductForm(): void {
    this.showProductForm = true;
  }
  closeProductForm(): void {
    this.showProductForm = false;
  }
}
