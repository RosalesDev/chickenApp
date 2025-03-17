import { Component, inject, Input } from '@angular/core';
import { Product } from '../../../../../../core/models/product-model';
import { ProductService } from '../../../../services/product.service';
import Swal from 'sweetalert2';

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
      .getProducts()
      .then((newProducts: Product[]) => {
        this.products = [...this.products, ...newProducts];
      })
      .catch((error) => {
        console.error(error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al cargar los productos',
        });
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  // Eliminar producto
  deleteProductById(id: string): void {
    Swal.fire({
      title: 'Eliminar producto',
      text: '¿Estás seguro de eliminar este producto?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Eliminar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.productService
          .deleteProductById(id) // Corrección en la concatenación del ID
          .then(() => {
            this.products = this.products.filter(
              (product) => product.id !== id
            );
            Swal.fire({
              title: 'Eliminado!',
              text: 'Se ha eliminado el producto correctamente',
              icon: 'success',
            });
          })
          .catch((error) => {
            console.error(error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Ocurrió un error al eliminar el producto',
            });
          })
          .finally(() => {
            this.isLoading = false; // Se ejecuta siempre al final
          });
      } else {
        this.isLoading = false; // Si cancela, también dejamos de cargar
      }
    });
  }
}
