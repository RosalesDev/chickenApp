import { Component, effect, inject, signal } from '@angular/core';
import { ProductService } from '../../services/product.service';
import { CurrencyPipe } from '@angular/common';
import { Product } from '../../../../core/models/product-model';
import { trigger, style, animate, transition } from '@angular/animations';
import { ModalSpinnerComponent } from '../../../../shared/components/modal-spinner/modal-spinner.component';
import { Sale } from '../../../../core/models/sale-model';
import { SaleSummaryModalComponent } from './components/sale-summary-modal/sale-summary-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pos',
  imports: [CurrencyPipe, ModalSpinnerComponent, SaleSummaryModalComponent],
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

  constructor() {
    // Recalcular el subtotal automáticamente cuando cambie la lista de productos
    effect(() => {
      let acumulated: number = 0;
      this.scannedProducts().forEach((product) => {
        if (product.amount_to_pay) {
          acumulated += product.amount_to_pay * product.quantity;
        } else {
          if (product.priceType) {
            acumulated +=
              product.priceType === 'unit'
                ? product.priceByUnit! * product.quantity
                : product.priceByKg! * product.quantity;
          } else {
            if (!product.priceByUnit) {
              acumulated += product?.priceByKg! * product!.quantity;
            } else {
              acumulated += product?.priceByUnit! * product!.quantity;
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
    console.log('Productos enviados desde pos:', this.scannedProducts());

    this.currentSaleSummary.set({
      products: this.scannedProducts(),
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
      const isInProductList = this.scannedProducts().find(
        (product) => product.barcode === inputValue
      );

      if (isInProductList) {
        // Incrementa la cantidad si el producto ya existe en la lista
        isInProductList.quantity++;
        this.scannedProducts.update((products) =>
          products.map((product) =>
            product.barcode === inputValue ? isInProductList : product
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
          const isInProductList = this.scannedProducts().find(
            (product) => product.pluCode === pluCode
          );
          if (isInProductList) {
            isInProductList.quantity++;
            this.scannedProducts.update((products) =>
              products.map((product) =>
                product.pluCode === pluCode ? isInProductList : product
              )
            );
            this.hideLoadingModal(); // Oculta el modal
          } else {
            const productByPlu = await this.productService.getProductsByPluCode(
              pluCode
            );

            console.log('Producto encontrado por PLU:', productByPlu[0]);
            if (productByPlu.length > 0) {
              const newProduct = {
                ...productByPlu[0], // Información del producto
                quantity: 1, // Inicializa la cantidad en 1
                amount_to_pay: Number(inputValue.slice(6, 12)),
              };
              this.scannedProducts.update((products) => [
                ...products,
                newProduct,
              ]);
              console.log('Scanned Products: ', this.scannedProducts());
            } else {
              console.log('No se encontró el producto');
            }
          }
        } else {
          // const newProduct = {
          //   ...product()[0], // Información del producto
          //   quantity: 1, // Inicializa la cantidad en 1
          // };
          // this.scannedProducts.update((products) => [...products, newProduct]);
          const foundProduct = product()[0];

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
            this.scannedProducts.update((products) => [
              ...products,
              newProduct,
            ]);
          } else {
            const newProduct = {
              ...foundProduct,
              quantity: 1, // Inicializa la cantidad en 1
            };
            this.scannedProducts.update((products) => [
              ...products,
              newProduct,
            ]);
          }
        }

        this.hideLoadingModal(); // Oculta el modal
      }
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
    this.scannedProducts.set([]); // Limpia los productos
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
    // if (searchTerm.length >= 3 && products) {
    //   this.filteredProducts = products.filter((product: Product) =>
    //     product.name.toLowerCase().includes(searchTerm.toLowerCase())
    //   );
    //   this.showFilteredProducts.set(this.filteredProducts.length > 0);
    // } else {
    //   this.filteredProducts = [];
    // }
  }

  selectProduct(item: Product, input: HTMLInputElement): void {
    const isProductInList = this.scannedProducts().find(
      (product) => item.name === product.name
    );

    if (isProductInList) {
      // Incrementa la cantidad si el producto ya existe en la lista
      isProductInList.quantity++;
      this.scannedProducts.update((products) =>
        products.map((product) =>
          product.name === item.name ? isProductInList : product
        )
      );
      this.hideLoadingModal(); // Oculta el modal
    } else {
      const newProduct = {
        ...item, // Información del producto
        quantity: 1, // Inicializa la cantidad en 1
      };
      this.scannedProducts.update((products) => [...products, newProduct]);
    }
    this.showFilteredProducts.set(false);
    input.value = '';
    this.focusBarcodeInput();
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
    this.scannedProducts.set([]); // Limpia los productos escaneados
    this.focusBarcodeInput();
  }

  finalizeSale(): void {
    this.updateSaleSummary(); // Actualiza la venta actual
  }
}
