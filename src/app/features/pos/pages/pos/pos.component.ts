import {
  Component,
  effect,
  inject,
  signal,
  ElementRef,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { CurrencyPipe, UpperCasePipe } from '@angular/common';
import { Product } from '../../../../core/models/product-model';
import { trigger, style, animate, transition } from '@angular/animations';
import { ModalSpinnerComponent } from '../../../../shared/components/modal-spinner/modal-spinner.component';
import { Sale } from '../../../../core/models/sale-model';
import { SaleSummaryModalComponent } from './components/sale-summary-modal/sale-summary-modal.component';
import Swal from 'sweetalert2';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../../../core/models/customer-model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pos',
  imports: [
    FormsModule,
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
          }),
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
  private router = inject(Router);
  private productService = inject(ProductService); // Inyecta el servicio
  private customerService = inject(CustomerService); // Inyecta el servicio de clientes
  showFilteredProducts = signal<boolean>(false);
  newSale = signal<Sale>(new Sale()); // Venta actual
  currentSaleSummary = signal<{
    products: any[];
    total: number;
    customer: Customer | null;
    billingType: 'CONSUMIDOR_FINAL' | 'RESPONSABLE_INSCRIPTO' | 'SIN_FACTURA';
  }>({
    products: [],
    total: 0,
    customer: null,
    billingType: 'CONSUMIDOR_FINAL',
  }); // Resumen de la venta
  // NUEVAS SIGNALS PARA FACTURACIÓN
  isPosReady = signal<boolean>(true); // Controla si se muestra la UI
  billingType = signal<
    'CONSUMIDOR_FINAL' | 'RESPONSABLE_INSCRIPTO' | 'SIN_FACTURA'
  >('CONSUMIDOR_FINAL');
  customerDocument = signal<string | null>(null); // Guardará el CUIT si aplica
  selectedCustomer: Customer | null = null;

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
                ? product.price_by_unit! * product.quantity
                : product.price_by_kg! * product.quantity;
          } else {
            product.is_weighed
              ? product.price_by_kg! * product.quantity
              : (acumulated += product.price_by_unit! * product.quantity);
            if (!product.price_by_unit) {
              acumulated += product?.price_by_kg! * product!.quantity;
            }
          }
        }
      });
      console.log('Subtotal calculado:', acumulated);
      this.subtotal.set(acumulated);
    });
  }

  ngOnDestroy(): void {
    sessionStorage.removeItem('productList');
  }

  ngOnInit(): void {
    this.initializeProducts();
  }

  private initializeProducts(): void {
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
            JSON.stringify(this.productService.allProducts()),
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
          this.focusBarcodeInput();
        });
    } else {
      this.focusBarcodeInput();
    }
  }

  async onBillingTypeChange(
    newType: 'CONSUMIDOR_FINAL' | 'RESPONSABLE_INSCRIPTO' | 'SIN_FACTURA',
  ) {
    // Guardamos el tipo anterior por si el usuario cancela la búsqueda
    const previousType = this.billingType();

    if (newType === 'RESPONSABLE_INSCRIPTO') {
      // Disparamos la búsqueda de cliente
      const success = await this.searchCustomerForInvoice();
      if (success) {
        this.billingType.set(newType);
        this.focusBarcodeInput();
      } else {
        // Si canceló la búsqueda (cerró el modal), volvemos al select anterior silenciosamente
        this.billingType.set(null as any);
        setTimeout(() => this.billingType.set(previousType), 0);
      }
    } else {
      // Si elige Consumidor Final o Sin Factura:
      // Cambiamos el tipo y limpiamos los datos del cliente, ¡PERO DEJAMOS LOS PRODUCTOS!
      this.billingType.set(newType);
      this.customerDocument.set(null);
      this.selectedCustomer = null;
      this.focusBarcodeInput();
    }
  }

  // Lógica extraída de tu antiguo promptBillingType
  private async searchCustomerForInvoice(): Promise<boolean> {
    const { value: searchTerm } = await Swal.fire({
      title: 'Buscar Cliente (Responsable Inscripto)',
      input: 'text',
      inputLabel: 'Ingresá el CUIT o parte de la Razón Social',
      inputPlaceholder: 'Ej: 3071... o Perez',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Buscar',
      inputValidator: (value) => {
        if (!value || value.trim().length < 3)
          return 'Ingresá al menos 3 caracteres';
        return null;
      },
    });

    if (!searchTerm) return false;

    Swal.fire({
      title: 'Buscando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const allCustomers = await this.customerService.getAllCustomers();
    const isNumeric = /^\d+$/.test(searchTerm.trim());
    let matches: Customer[] = isNumeric
      ? allCustomers.filter((c) => c.cuit && c.cuit.includes(searchTerm.trim()))
      : allCustomers.filter(
          (c) =>
            c.name &&
            c.name.toLowerCase().includes(searchTerm.trim().toLowerCase()),
        );

    Swal.close();

    if (matches.length > 0) {
      let selectedId: string | null = null;
      const listHtml = `
        <div class="list-group text-start shadow-sm mt-3" style="max-height: 300px; overflow-y: auto;">
          ${matches
            .map(
              (c) => `
            <button type="button" class="list-group-item list-group-item-action customer-row" data-id="${c.id}">
              <div class="d-flex w-100 justify-content-between align-items-center">
                <h6 class="mb-1 fw-bold text-primary">${c.name}</h6>
                <small class="badge bg-secondary">CUIT: ${c.cuit || 'N/A'}</small>
              </div>
              <small class="text-muted"><i class="bi bi-geo-alt"></i> ${c.address || 'Sin dirección registrada'}</small>
            </button>
          `,
            )
            .join('')}
        </div>`;

      await Swal.fire({
        title: 'Seleccionar Cliente',
        html: listHtml,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        showConfirmButton: false,
        didOpen: () => {
          document.querySelectorAll('.customer-row').forEach((row) => {
            row.addEventListener('click', (e) => {
              selectedId = (e.currentTarget as HTMLElement).getAttribute(
                'data-id',
              );
              Swal.close();
            });
          });
        },
      });

      if (selectedId) {
        const found = matches.find((c) => c.id === selectedId);
        if (found) {
          this.selectedCustomer = found;
          this.customerDocument.set(found.cuit || null);
          return true;
        }
      }
      return false; // Canceló en la lista
    } else {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Cliente no encontrado',
        text: `No encontramos ningún cliente con "${searchTerm}". ¿Deseas registrar uno nuevo?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, crear cliente',
        cancelButtonText: 'Cancelar',
      });

      if (result.isConfirmed) {
        const queryParams = isNumeric
          ? { cuit: searchTerm.trim() }
          : { name: searchTerm.trim() };
        this.router.navigate(['/home/create-customer'], { queryParams });
      }
      return false;
    }
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
        'barcode-input',
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
      customer: this.selectedCustomer,
      billingType: this.billingType(),
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
        (product) => product.barcode === inputValue,
      );

      if (foundProductInSale) {
        // Incrementa la cantidad si el producto ya existe en la lista
        foundProductInSale.quantity++;
        foundProductInSale.subtotal =
          foundProductInSale.quantity * foundProductInSale.price_by_unit!;
        this.productToSaleList.update((products) =>
          products.map((product) =>
            product.barcode === inputValue ? foundProductInSale : product,
          ),
        );
        this.hideLoadingModal(); // Oculta el modal
      } else {
        // Busca el producto por barcode en la base de datos
        const product =
          await this.productService.getProductByBarcode(inputValue);
        // BUSQUEDA POR PLU
        if (product().length === 0) {
          inputType = 'PLU';
          const pluCode: string = inputValue.slice(1, 6);
          const foundProductInSale = this.productToSaleList().find(
            (product) => product.plu_code === pluCode,
          );
          if (foundProductInSale) {
            foundProductInSale.quantity++;
            foundProductInSale.subtotal =
              foundProductInSale.quantity * foundProductInSale.amount_to_pay!;
            this.productToSaleList.update((products) =>
              products.map((product) =>
                product.plu_code === pluCode ? foundProductInSale : product,
              ),
            );
            this.hideLoadingModal(); // Oculta el modal
          } else {
            const productByPlu =
              await this.productService.getProductsByPluCode(pluCode);

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
                  subtotal: Number(inputValue.slice(6, 12)),
                };
                this.productToSaleList.update((products) => [
                  ...products,
                  newProduct,
                ]);
                this.hideLoadingModal();
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
            this.focusBarcodeInput();
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
    if (foundProduct.price_by_unit && foundProduct.price_by_kg) {
      const priceType = await this.promptPriceTypeSelection(foundProduct);

      if (!priceType) {
        this.hideLoadingModal(); // Usuario canceló
        this.focusBarcodeInput();
        return;
      }

      const newProduct = {
        ...foundProduct,
        quantity: 1,
        price:
          priceType === 'unit'
            ? foundProduct.price_by_unit
            : foundProduct.price_by_kg,
        priceType, // para guardar cuál se eligió
      };
      this.productToSaleList.update((products) => [...products, newProduct]);
    } else {
      if (foundProduct.price_by_unit) {
        const newProduct = {
          ...foundProduct,
          quantity: 1, // Inicializa la cantidad en 1
          price: foundProduct.price_by_unit,
          priceType: 'unit',
          subtotal: foundProduct.price_by_unit,
        };
        this.productToSaleList.update((products) => [...products, newProduct]);
      }
      if (foundProduct.price_by_kg) {
        const newProduct = {
          ...foundProduct,
          quantity: 1, // Inicializa la cantidad en 1
          price: foundProduct.price_by_kg,
          priceType: 'kilo',
          subtotal: foundProduct.price_by_kg,
        };
        this.productToSaleList.update((products) => [...products, newProduct]);
      }
    }
  }

  async promptPriceTypeSelection(
    product: any,
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
        product.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      this.showFilteredProducts.set(this.filteredProducts.length > 0);
    }
  }

  selectProduct(item: Product, input: HTMLInputElement): void {
    this.showFilteredProducts.set(false);
    input.value = '';

    if (!item.price_by_kg && item.price_by_unit) {
      this.showUnitProductAlert(item);
    }

    if (!item.price_by_unit && item.price_by_kg) {
      this.showWeighableProductAlert(item);
    }

    if (item.price_by_kg && item.price_by_unit) {
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
              'input[name="tipoVenta"]:checked',
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
        <p class="mb-2">Precio unitario: <strong>${product.price_by_unit?.toLocaleString(
          'es-AR',
          { style: 'currency', currency: 'ARS' },
        )}</strong></p>
        <hr>
        <div class="swal2-input-container">
          <label for="swal-input-quantity" class="form-label">Cantidad:</label>
          <input id="swal-input-quantity" class="swal2-input" type="number" value="1" min="1" step="1">
          <h3 class="mt-4">Subtotal: <strong id="subtotal-display">${product.price_by_unit?.toLocaleString(
            'es-AR',
            { style: 'currency', currency: 'ARS' },
          )}</strong></h3>
        </div>
      `,
      confirmButtonText: 'Agregar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      // Se ejecuta cuando el modal se renderiza
      didOpen: () => {
        const quantityInput = document.getElementById(
          'swal-input-quantity',
        ) as HTMLInputElement;
        quantityInput.focus();
        quantityInput.oninput = () => {
          const quantity = parseInt(quantityInput.value, 10) || 0;
          const subtotal = quantity * product.price_by_unit!;
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
          10,
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
          subtotal: result.value * product.price_by_unit!,
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
        <p class="mb-2">Precio por Kilo: <strong>${product.price_by_kg?.toLocaleString(
          'es-AR',
          { style: 'currency', currency: 'ARS' },
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
          'swal-input-weight',
        ) as HTMLInputElement;
        weightInput.focus();
        weightInput.oninput = () => {
          const weightInGrams = parseInt(weightInput.value, 10) || 0;
          const subtotal = (weightInGrams / 1000) * product.price_by_kg!;
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
          10,
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
          subtotal: weightInKg * product.price_by_kg!,
        };
        this.addProductToList(productToAdd);
      }
      this.focusBarcodeInput();
    });
  }
  private addProductToList(productToAdd: Product): void {
    // Esta función no necesita cambios, maneja la lógica de agregar a la lista.
    const existingProduct = this.productToSaleList().find(
      (p) => p.id === productToAdd.id && !p.is_weighed,
    );

    if (existingProduct) {
      existingProduct.quantity += productToAdd.quantity;
      this.productToSaleList.update((products) =>
        products.map((p) =>
          p.id === existingProduct.id ? existingProduct : p,
        ),
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
        .filter((product): product is Product => product !== null),
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
    this.subtotal.set(0);

    // NUEVO: Limpiamos los datos del cliente y el tipo de facturación
    this.selectedCustomer = null;
    this.customerDocument.set(null);
    this.billingType.set('CONSUMIDOR_FINAL');
    this.currentSaleSummary.set({
      products: [],
      total: 0,
      customer: null,
      billingType: 'CONSUMIDOR_FINAL',
    });

    this.focusBarcodeInput();

    // IMPORTANTE: Volvemos a lanzar el modal inicial para el próximo cliente
    //this.promptBillingType();
  }

  finalizeSale(): void {
    this.updateSaleSummary(); // Actualiza la venta actual
  }
}
