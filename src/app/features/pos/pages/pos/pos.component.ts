import {
  Component,
  effect,
  inject,
  signal,
  ElementRef,
  HostListener,
} from '@angular/core';
import { ProductService } from '../../services/product.service';
import { CurrencyPipe, UpperCasePipe } from '@angular/common';
import { Product } from '../../../../core/models/product-model';
import { trigger, style, animate, transition } from '@angular/animations';
import { ModalSpinnerComponent } from '../../../../shared/components/modal-spinner/modal-spinner.component';
import { Sale } from '../../../../core/models/sale-model';
import { SaleSummaryModalComponent } from './components/sale-summary-modal/sale-summary-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pos',
  imports: [
    CurrencyPipe,
    UpperCasePipe,
    ModalSpinnerComponent,
    SaleSummaryModalComponent,
  ],
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
  productToSaleList = signal<Product[]>([]); // Lista de productos escaneados
  filteredProducts: Product[] = [];
  selectedProduct!: Product;
  productsFoundByName = signal<Product[]>([]); // Resultado de la busqueda por nombre
  subtotal = signal<number>(0); // Subtotal calculado
  private productService = inject(ProductService); // Inyecta el servicio
  showFilteredProducts = signal<boolean>(false);
  newSale = signal<Sale>(new Sale()); // Venta actual
  currentSaleSummary = signal<{
    products: any[];
    total: number;
  }>({
    products: [],
    total: 0,
  }); // Resumen de la venta

  constructor(private elementRef: ElementRef) {
    // Recalcular el subtotal automáticamente cuando cambie la lista de productos
    effect(() => {
      let acumulated: number = 0;
      this.productToSaleList().forEach((product) => {
        if (product.amount_to_pay) {
          acumulated += product.amount_to_pay * product.quantity;
        } else {
          if (product.priceType) {
            acumulated +=
              product.priceType === 'unit'
                ? product.priceByUnit! * product.quantity
                : product.priceByKg! * product.quantity;
          } else {
            product.isWeighed
              ? product.priceByKg! * product.quantity
              : product.priceByUnit! * product.quantity;
            if (!product.priceByUnit) {
              acumulated += product?.priceByKg! * product!.quantity;
            }
          }
        }
      });
      console.log('Subtotal calculado:', acumulated);
      this.subtotal.set(acumulated);
    });
  }

  ngOnInit(): void {
    if (
      !sessionStorage.getItem('productList') ||
      sessionStorage.getItem('productList') === '[]'
    ) {
      this.showLoadingModal();
      this.productService
        .getProducts()
        .then((products) => {
          sessionStorage.setItem(
            'productList',
            JSON.stringify(this.productService.allProducts())
          );
        })
        .catch((error) => {
          console.error('Error al obtener los productos:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error al obtener los productos',
          });
        })
        .finally(() => {
          this.hideLoadingModal();
        });
    }
    this.focusBarcodeInput();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    // Verifica si la lista está visible Y si el clic fue FUERA del componente
    if (
      this.showFilteredProducts() &&
      !this.elementRef.nativeElement.contains(event.target)
    ) {
      this.showFilteredProducts.set(false);
    }
  }

  focusBarcodeInput(): void {
    console.log('Enfocando el input de código de barras...');
    setTimeout(() => {
      const barcodeInput = document.getElementById(
        'barcode-input'
      ) as HTMLInputElement;
      if (barcodeInput) {
        barcodeInput.focus(); // Enfoca el input de código de barras
      }
    }, 500); // Asegura que el DOM esté listo antes de enfocar
  }
  //TODO: Hacer que la venta se genere despues de que presionen el boton de finalizar venta.
  updateSaleSummary(): void {
    console.log('Total enviado desde pos:', this.subtotal());
    console.log('Productos enviados desde pos:', this.productToSaleList());

    this.currentSaleSummary.set({
      products: this.productToSaleList(),
      total: this.subtotal(),
    }); // Actualiza el resumen de la venta.
  }
  /**
   *
   * @param inputValue - Valor ingresado por el usuario.
   * @description Busca un producto por nombre o código de barras.
   * @returns
   */
  async searchProduct(inputValue: string): Promise<void> {
    this.showLoadingModal();
    let inputType = /^\d+$/.test(inputValue) ? 'BARCODE' : 'PRODUCT_NAME';
    console.log('Tipo de busqueda:', inputType);

    if (inputType === 'PRODUCT_NAME') {
      this.onSearchByName(inputValue);
      this.hideLoadingModal();
    } else {
      //Asumo que si un producto se guarda con un código de barras, no se puede guardar con un PLU.
      const foundProductInSale = this.productToSaleList().find(
        (product) => product.barcode === inputValue
      );

      if (foundProductInSale) {
        // Incrementa la cantidad si el producto ya existe en la lista
        foundProductInSale.quantity++;
        this.productToSaleList.update((products) =>
          products.map((product) =>
            product.barcode === inputValue ? foundProductInSale : product
          )
        );
        this.hideLoadingModal(); // Oculta el modal
      } else {
        // Busca el producto por barcode en la base de datos
        const product = await this.productService.getProductByBarcode(
          inputValue
        );
        // BUSQUEDA POR PLU
        if (product().length === 0) {
          inputType = 'PLU';
          const pluCode: string = inputValue.slice(1, 6);
          const foundProductInSale = this.productToSaleList().find(
            (product) => product.pluCode === pluCode
          );
          if (foundProductInSale) {
            foundProductInSale.quantity++;
            this.productToSaleList.update((products) =>
              products.map((product) =>
                product.pluCode === pluCode ? foundProductInSale : product
              )
            );
            this.hideLoadingModal(); // Oculta el modal
          } else {
            const productByPlu = await this.productService.getProductsByPluCode(
              pluCode
            );

            const numberOfProductsFound = productByPlu.length;

            switch (numberOfProductsFound) {
              case 0:
                Swal.fire({
                  icon: 'error',
                  title: 'Producto no encontrado',
                  text: `No se encontró ningún producto con el PLU ${pluCode}.`,
                });
                this.hideLoadingModal();
                return;
              case 1:
                const newProduct = {
                  ...productByPlu[0], // Información del producto
                  quantity: 1, // Inicializa la cantidad en 1
                  amount_to_pay: Number(inputValue.slice(6, 12)),
                };
                this.productToSaleList.update((products) => [
                  ...products,
                  newProduct,
                ]);
                console.log('Scanned Products: ', this.productToSaleList());
                return;
              default:
                Swal.fire({
                  icon: 'error',
                  title: 'Múltiples productos encontrados',
                  text: `Se encontraron ${numberOfProductsFound} productos con el PLU ${pluCode}.`,
                });
                this.hideLoadingModal();
                return;
            }
          }
        } else {
          // BUSQUEDA POR CÓDIGO DE BARRAS POSITIVA

          if (product().length > 1) {
            Swal.fire({
              icon: 'error',
              title: 'Múltiples productos encontrados',
              text: `Se encontraron ${
                product().length
              } productos con el código de barras ${inputValue}.`,
            });
            this.hideLoadingModal();
            return;
          }
          const foundProduct = product()[0];

          await this.determinePriceType(foundProduct);
        }

        this.hideLoadingModal(); // Oculta el modal
      }
    }
  }
  async determinePriceType(foundProduct: Product) {
    if (foundProduct.priceByUnit && foundProduct.priceByKg) {
      const priceType = await this.promptPriceTypeSelection(foundProduct);

      if (!priceType) {
        this.hideLoadingModal(); // Usuario canceló
        return;
      }

      const newProduct = {
        ...foundProduct,
        quantity: 1,
        price:
          priceType === 'unit'
            ? foundProduct.priceByUnit
            : foundProduct.priceByKg,
        priceType, // para guardar cuál se eligió
      };
      this.productToSaleList.update((products) => [...products, newProduct]);
    } else {
      const newProduct = {
        ...foundProduct,
        quantity: 1, // Inicializa la cantidad en 1
      };
      this.productToSaleList.update((products) => [...products, newProduct]);
    }
  }

  async promptPriceTypeSelection(
    product: any
  ): Promise<'unit' | 'kilo' | null> {
    const { value: option } = await Swal.fire({
      title: 'Seleccioná el tipo de precio',
      text: `El producto "${product.name}" tiene precio por unidad y por kilo`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Precio por unidad',
      cancelButtonText: 'Precio por kilo',
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });

    return option ? 'unit' : 'kilo';
  }

  clearCart(): void {
    this.productToSaleList.set([]); // Limpia los productos
    this.subtotal.set(0); // Reinicia el subtotal
  }
  onSearchByName(searchTerm: string) {
    const products = this.productService.allProducts();
    if (searchTerm.length < 3 && !products) {
      this.filteredProducts = [];
    } else {
      this.filteredProducts = products.filter((product: Product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      this.showFilteredProducts.set(this.filteredProducts.length > 0);
    }
  }

  selectProduct(item: Product, input: HTMLInputElement): void {
    this.showFilteredProducts.set(false);
    input.value = '';

    Swal.fire({
      title: 'Seleccionar Tipo de Venta',
      html: `
        <div style="display: flex; justify-content: center; gap: 1rem;">
            <input type="radio" id="kilo" name="tipoVenta" value="kilo" checked>
            <label for="kilo">Por Kilo</label>
            <input type="radio" id="unidad" name="tipoVenta" value="unit">
            <label for="unidad">Por Unidad</label>
        </div>`,
      confirmButtonText: 'Aceptar',
      focusConfirm: false,
      preConfirm: () => {
        // Obtiene el valor del radio button seleccionado
        const tipoVenta = (
          Swal.getPopup()!.querySelector(
            'input[name="tipoVenta"]:checked'
          ) as HTMLInputElement | null
        )?.value;
        if (!tipoVenta) {
          Swal.showValidationMessage(`Por favor, selecciona una opción`);
          return false;
        }
        return tipoVenta;
      },
    }).then((result) => {
      // Si el usuario presionó "Aceptar" y la validación fue exitosa
      if (result.isConfirmed) {
        const tipoSeleccionado = result.value; // 'kilo' o 'unit'

        console.log('El usuario seleccionó:', tipoSeleccionado);

        if (tipoSeleccionado === 'kilo') {
          this.showWeighableProductAlert(item);
        } else {
          this.showUnitProductAlert(item);
        }
      }
    });
  }
  /**
   * * Muestra un modal para agregar un producto por unidad.
   * * Permite ingresar la cantidad y calcula el subtotal.
   * @param product - Producto seleccionado.
   */
  private showUnitProductAlert(product: Product): void {
    Swal.fire({
      title: product.name,
      html: `
        <p class="mb-2">Precio unitario: <strong>${product.priceByUnit?.toLocaleString(
          'es-AR',
          { style: 'currency', currency: 'ARS' }
        )}</strong></p>
        <hr>
        <div class="swal2-input-container">
          <label for="swal-input-quantity" class="form-label">Cantidad:</label>
          <input id="swal-input-quantity" class="swal2-input" type="number" value="1" min="1" step="1">
          <h3 class="mt-4">Subtotal: <strong id="subtotal-display">${product.priceByUnit?.toLocaleString(
            'es-AR',
            { style: 'currency', currency: 'ARS' }
          )}</strong></h3>
        </div>
      `,
      confirmButtonText: 'Agregar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      // Se ejecuta cuando el modal se renderiza
      didOpen: () => {
        const quantityInput = document.getElementById(
          'swal-input-quantity'
        ) as HTMLInputElement;
        quantityInput.focus();
        quantityInput.oninput = () => {
          const quantity = parseInt(quantityInput.value, 10) || 0;
          const subtotal = quantity * product.priceByUnit!;
          const subtotalDisplay = document.getElementById('subtotal-display')!;
          subtotalDisplay.innerText = subtotal.toLocaleString('es-AR', {
            style: 'currency',
            currency: 'ARS',
          });
        };
      },
      // Valida antes de confirmar
      preConfirm: () => {
        const quantity = parseInt(
          (document.getElementById('swal-input-quantity') as HTMLInputElement)
            .value,
          10
        );
        if (!quantity || quantity < 1) {
          Swal.showValidationMessage('La cantidad debe ser al menos 1');
          return false; // Evita que el modal se cierre
        }
        return quantity;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const productToAdd = {
          ...product,
          priceType: 'unit',
          quantity: result.value,
          subtotal: result.value * product.priceByUnit!,
        };
        this.addProductToList(productToAdd);
      }
      this.focusBarcodeInput();
    });
  }

  private showWeighableProductAlert(product: Product): void {
    Swal.fire({
      title: product.name,
      html: `
        <p class="mb-2">Precio por Kilo: <strong>${product.priceByKg?.toLocaleString(
          'es-AR',
          { style: 'currency', currency: 'ARS' }
        )}/Kg.</strong></p>
        <hr>
        <div class="swal2-input-container">
          <label for="swal-input-weight" class="form-label">Peso (en gramos):</label>
          <input id="swal-input-weight" class="swal2-input" type="number" placeholder="Ej: 1500" min="100">
          <h3 class="mt-4">Subtotal: <strong id="subtotal-display">$0.00</strong></h3>
        </div>
      `,
      confirmButtonText: 'Agregar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const weightInput = document.getElementById(
          'swal-input-weight'
        ) as HTMLInputElement;
        weightInput.focus();
        weightInput.oninput = () => {
          const weightInGrams = parseInt(weightInput.value, 10) || 0;
          const subtotal = (weightInGrams / 1000) * product.priceByKg!;
          const subtotalDisplay = document.getElementById('subtotal-display')!;
          subtotalDisplay.innerText = subtotal.toLocaleString('es-AR', {
            style: 'currency',
            currency: 'ARS',
          });
        };
      },
      preConfirm: () => {
        const weight = parseInt(
          (document.getElementById('swal-input-weight') as HTMLInputElement)
            .value,
          10
        );
        if (!weight || weight < 100) {
          Swal.showValidationMessage('El peso mínimo es de 100 gramos');
          return false;
        }
        return weight; // Retorna el peso en gramos
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const weightInGrams = result.value;
        const weightInKg = weightInGrams / 1000;
        const productToAdd = {
          ...product,
          priceType: 'kilo',
          quantity: weightInKg, // Guardamos la cantidad en Kg
          subtotal: weightInKg * product.priceByKg!,
        };
        this.addProductToList(productToAdd);
      }
      this.focusBarcodeInput();
    });
  }
  private addProductToList(productToAdd: Product): void {
    // Esta función no necesita cambios, maneja la lógica de agregar a la lista.
    const existingProduct = this.productToSaleList().find(
      (p) => p.id === productToAdd.id && !p.isWeighed
    );

    if (existingProduct) {
      existingProduct.quantity += productToAdd.quantity;
      this.productToSaleList.update((products) =>
        products.map((p) => (p.id === existingProduct.id ? existingProduct : p))
      );
    } else {
      this.productToSaleList.update((products) => [...products, productToAdd]);
    }
  }

  removeProduct(productId: string): void {
    this.productToSaleList.update((products) =>
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
  /**
   * * Muestra el modal de carga.
   * * Se asegura de que el modal esté visible y evita el scroll del body.
   */
  private showLoadingModal(): void {
    const modalElement = document.getElementById('loadingModal');
    if (modalElement) {
      modalElement.classList.add('show'); // Agrega la clase 'show'
      modalElement.style.display = 'block'; // Muestra el modal
      document.body.classList.add('modal-open'); // Evita el scroll en el fondo
    }
  }
  /**
   * * Oculta el modal de carga.
   * * Se asegura de que el modal no esté visible y restaura el scroll del body.
   */
  private hideLoadingModal(): void {
    const modalElement = document.getElementById('loadingModal');
    if (modalElement) {
      modalElement.classList.remove('show'); // Quita la clase 'show'
      modalElement.style.display = 'none'; // Oculta el modal
      document.body.classList.remove('modal-open'); // Restaura el scroll
    }
  }

  cleanSale(): void {
    this.productToSaleList.set([]); // Limpia los productos escaneados
    this.focusBarcodeInput();
  }

  finalizeSale(): void {
    this.updateSaleSummary(); // Actualiza la venta actual
  }
}
