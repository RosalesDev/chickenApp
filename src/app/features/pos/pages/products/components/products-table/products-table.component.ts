import { Component, inject, Input } from '@angular/core';
import { Product } from '../../../../../../core/models/product-model';
import { ProductService } from '../../../../services/product.service';
import Swal from 'sweetalert2';
import { HasRoleDirective } from '../../../../../../shared/directives/has-role.directive';

@Component({
  selector: 'app-products-table',
  imports: [HasRoleDirective],
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

  async loadProducts() {
    this.isLoading = true;
    const result = await this.productService.getProducts();
    if ('success' in result && result.success === false) {
      this.isLoading = false;
      console.log(result.error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al cargar los productos',
      });
    } else {
      // this.products = [...this.products, ...result as Product[]];
      this.products = result as Product[];
      this.isLoading = false;
    }
  }

  //Editar producto
  openEditModal(product: Product): void {
    Swal.fire({
      title: 'Editar Producto',
      html: `
        <div class="container-fluid text-start">
            <div class="form-floating mb-2">
                <input id="swal-input-name" class="form-control" value="${product.name}">
                <label for="swal-input-name" class="form-label">Nombre</label>
            </div>
            <div class="row">
                <div class="form-floating col-md-6 mb-2">
                    <input id="swal-input-initials" class="form-control" value="${product.initials}">
                    <label for="swal-input-initials" class="form-label">Iniciales</label>
                </div>
                <div class="form-floating col-md-6 mb-2">
                    <input id="swal-input-plu" class="form-control" value="${product.plu_code}">
                    <label for="swal-input-plu" class="form-label">PLU</label>
                </div>
            </div>
            <div class="row">
                <div class="form-floating col-md-4 mb-2">
                    <input id="swal-input-stock" type="number" class="form-control" value="${product.availability_in_deposit}">
                    <label for="swal-input-stock" class="form-label">Stock</label>
                </div>
                <div class="form-floating col-md-4 d-flex justify-content-center">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" id="swal-is-weighed">
                    <label class="form-check-label" for="swal-is-weighed">Es Pesable</label>
                  </div>
                </div>
                <div class="form-floating col-md-4 d-flex justify-content-center">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" id="swal-is-local">
                    <label class="form-check-label" for="swal-is-local">Es Local</label>
                  </div>
                </div>
            </div>
            <div class="row">
                <div class="form-floating col-md-6 mb-2">
                    <input id="swal-input-price-unit" type="number" class="form-control" value="${product.price_by_unit}">
                    <label for="swal-input-price-unit" class="form-label">Precio por Unidad</label>
                </div>
                <div class="form-floating col-md-6 mb-2">
                    <input id="swal-input-price-kg" type="number" class="form-control" value="${product.price_by_kg}">
                    <label for="swal-input-price-kg" class="form-label">Precio por Kg</label>
                </div>
            </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const weighedSwitch = document.getElementById(
          'swal-is-weighed'
        ) as HTMLInputElement;
        const localSwitch = document.getElementById(
          'swal-is-local'
        ) as HTMLInputElement;

        if (weighedSwitch) {
          weighedSwitch.checked = product.is_weighed || false;
        }
        if (localSwitch) {
          localSwitch.checked = product.is_local || false;
        }
      },
      preConfirm: () => {
        // Recolecta los datos del formulario antes de confirmar
        const name = (
          document.getElementById('swal-input-name') as HTMLInputElement
        ).value;
        const plu_code = (
          document.getElementById('swal-input-plu') as HTMLInputElement
        ).value;
        const initials = (
          document.getElementById('swal-input-initials') as HTMLInputElement
        ).value;
        const availability_in_deposit = parseInt(
          (document.getElementById('swal-input-stock') as HTMLInputElement)
            .value,
          10
        );
        const price_by_unit = parseFloat(
          (document.getElementById('swal-input-price-unit') as HTMLInputElement)
            .value
        );
        const price_by_kg = parseFloat(
          (document.getElementById('swal-input-price-kg') as HTMLInputElement)
            .value
        );
        const is_weighed = (
          document.getElementById('swal-is-weighed') as HTMLInputElement
        ).checked;
        const is_local = (
          document.getElementById('swal-is-local') as HTMLInputElement
        ).checked;

        // Validación simple
        if (!name) {
          Swal.showValidationMessage(`El nombre es obligatorio`);
          return false;
        }

        return {
          name,
          plu_code,
          initials,
          availability_in_deposit,
          price_by_unit,
          price_by_kg,
          is_weighed,
          is_local,
        };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.isLoading = true;
        const updatedData = result.value;

        // NOTA: Asegúrate de tener un método 'updateProduct' en tu ProductService
        // que acepte el ID del producto y los datos a actualizar.
        this.productService
          .updateProduct(product.id!, updatedData)
          .then(() => {
            // Actualiza el producto en la lista local para no recargar la página
            const index = this.products.findIndex((p) => p.id === product.id);
            if (index !== -1) {
              this.products[index] = {
                ...this.products[index],
                ...updatedData,
              };
            }
            Swal.fire({
              title: '¡Actualizado!',
              text: 'El producto ha sido actualizado correctamente.',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false,
            });
          })
          .catch((error) => {
            console.error(error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Ocurrió un error al actualizar el producto.',
            });
          })
          .finally(() => {
            this.isLoading = false;
          });
      }
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
              showConfirmButton: false,
              timer: 1200,
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
