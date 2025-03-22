import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { Product } from '../../../../core/models/product-model';
import { ProductService } from '../../services/product.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductsTableComponent } from './components/products-table/products-table.component';

@Component({
  selector: 'app-products',
  imports: [RouterLink, ProductsTableComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css',
})
export class ProductsComponent {
  private productService = inject(ProductService);
  products: Product[] = [];
  searchQuery = '';
  isAdmin = true; // Cambia esto según tu lógica de roles
  limit = 10; // Tamaño de página
  isSearching = false; // Indica si se está buscando
  isLoading = false; // Indica si se están cargando productos
  productForm: FormGroup;
  showProductForm = false;
  isSearchVisible = false;

  @ViewChild('searchInput') searchInput!: ElementRef;

  constructor(private fb: FormBuilder) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      initials: ['', Validators.required],
      quantity: [0, Validators.required],
      price_by_unit: [0, Validators.required],
      price_by_kg: [0, Validators.required],
    });
  }

  // ngOnInit(): void {
  //   this.loadProducts();
  // }

  loadProducts(): void {
    this.isLoading = true;
    this.productService.getProducts().then((newProducts: Product[]) => {
      this.products = [...this.products, ...newProducts];
      this.isLoading = false;
    });
  }

  // Buscar productos por nombre
  async searchProducts(event: Event): Promise<void> {
    let query = (event.target as HTMLInputElement).value;

    if (!query) {
      // Si no hay texto de búsqueda, recarga los productos paginados
      this.isSearching = false;
      this.products = [];
      await this.loadProducts();
      return;
    }
    if (query.length > 3) {
      try {
        this.isSearching = true; // Indicar que se está buscando
        const searchResults = await this.productService.searchProducts(query);
        this.products = searchResults; // Mostrar solo los productos que coincidan
        this.isSearching = false;
      } catch (error) {
        console.error('Error al buscar productos:', error);
        this.isSearching = false;
      }
    }
  }
  editProduct(product: Product) {
    this.productService.updateProduct(product.id!, product);
  }

  deleteProduct(id: string): void {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      this.productService.deleteProductById(id).then(() => {
        this.products = this.products.filter((p) => p.id !== id);
      });
    }
  }

  toggleSearch() {
    this.isSearchVisible = !this.isSearchVisible;
    setTimeout(() => {
      if (this.isSearchVisible) {
        this.searchInput.nativeElement.focus();
      }
    }, 300);
  }

  openProductForm(): void {
    this.showProductForm = true;
  }
  closeProductForm(): void {
    this.showProductForm = false;
  }
}
