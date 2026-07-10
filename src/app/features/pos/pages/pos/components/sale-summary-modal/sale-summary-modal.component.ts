import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  EventEmitter,
  inject,
  input,
  Output,
  Signal,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalProductsTableComponent } from './components/modal-products-table/modal-products-table.component';
import Swal from 'sweetalert2';
import { SaleService } from '../../../../services/sale.service';
import {
  PaymentMethod,
  PaymentType,
} from '../../../../../../core/models/paymentMethod-model';
import { TicketService } from '../../../../services/ticket.service';
import { PaymentFactory } from './payment.factory';

@Component({
  selector: 'app-sale-summary-modal',
  imports: [CommonModule, FormsModule, ModalProductsTableComponent],
  templateUrl: './sale-summary-modal.component.html',
  styleUrl: './sale-summary-modal.component.css',
})
export class SaleSummaryModalComponent {
  // @Input() saleSummary: { products: any[]; total: number } = {
  //   products: [],
  //   total: 0,
  // };
  @Output() cleanSale = new EventEmitter<void>();
  @Output() focusBarcodeInput = new EventEmitter<void>();
  private saleService = inject(SaleService);
  private ticketService = inject(TicketService);
  private paymentFactory: PaymentFactory;

  notifyParent() {
    this.cleanSale.emit();
  }

  notifyFocusBarcodeInput() {
    this.focusBarcodeInput.emit();
  }

  saleSummary = input<{
    products: any[];
    total: number;
    customer: any;
    billingType: string;
  }>({
    products: [],
    total: 0,
    customer: null,
    billingType: 'CONSUMIDOR_FINAL',
  });

  discount = signal(0);
  payments: PaymentMethod[] = [];

  paymentSum = signal(this.payments?.reduce((sum, p) => sum + p.amount, 0));
  totalToPay: Signal<number> = computed(() => {
    console.log('total dentro del computed: ', this.saleSummary().total);

    const totalWithDiscount = this.saleSummary().total - this.discount();

    return totalWithDiscount - this.paymentSum();
  });

  defaultAmountInputValue = 0;
  isDiscountInputFirstFocus = true;
  isPaymentInputFirstFocus = true;
  isLoading = false;

  constructor() {
    this.paymentFactory = new PaymentFactory();
  }

  updatePaymentSum() {
    this.paymentSum.set(this.payments.reduce((sum, p) => sum + p.amount, 0));
  }

  resetTotalToPay() {
    this.discount.set(0);
    this.payments = [];
    this.paymentSum.set(0);
    this.notifyFocusBarcodeInput(); // Emitir el evento para enfocar el input de código de barras
  }

  setPaymentAmount(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const inputValue = Number(input.value);
    if (inputValue <= 0) {
      this.payments[index].amount = 0;
      this.updatePaymentSum();
    }
    switch (this.payments[index].type) {
      case 'cash':
        this.payments[index].name = 'Efectivo';
        break;
      case 'mp':
        this.payments[index].name = 'MercadoPago';
        break;
      case 'brubank':
        this.payments[index].name = 'Brubank';
        break;
      case 'nx':
        this.payments[index].name = 'NaranjaX';
        break;
      case 'cc':
        this.payments[index].name = 'Cuenta Corriente';
        break;
      default:
        this.payments[index].name = 'Otro';
        break;
    }
    this.payments[index].amount = Number(input.value);
    this.updatePaymentSum();
  }

  addPayment(
    payment: PaymentMethod = { type: 'cash', amount: 0, name: 'Efectivo' },
  ) {
    this.payments.push(payment);
  }

  public addTotalPayment(type: PaymentType) {
    this.isPaymentInputFirstFocus = false;

    try {
      // Usamos la fábrica para crear el objeto de pago
      const payment = this.paymentFactory.createPayment(
        type,
        this.totalToPay(),
      );

      this.payments.push(payment);
      this.updatePaymentSum();
    } catch (error) {
      console.error(`Error al procesar el pago de tipo ${type}:`, error);
      // Aquí podrías manejar el error, por ejemplo, mostrando una notificación al usuario.
    }
  }
  // addTotalCashPayment() {
  //   this.isPaymentInputFirstFocus = false;
  //   let payment: PaymentMethod = {
  //     type: 'cash',
  //     amount: this.totalToPay(),
  //   };
  //   this.payments.push(payment);
  //   this.paymentSum.set(this.payments.reduce((sum, p) => sum + p.amount, 0));
  // }

  removePayment(index: number) {
    this.payments.splice(index, 1);
    this.updatePaymentSum();
  }

  async finalizeSale() {
    Swal.fire({
      title: 'Validando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      //quito los botones de confirmación y cancelación para que no se pueda cerrar el modal
      showConfirmButton: false,
      allowEscapeKey: false,
    });

    try {
      // ---------------------------------------------------------
      // PASO 0: VERIFICAR STOCK ANTES DE HABLAR CON AFIP
      // ---------------------------------------------------------
      const stockCheck = await this.saleService.verifyStockAvailability(
        this.saleSummary().products,
      );
      if (!stockCheck.success) {
        // Si no hay stock, lanzamos el error aquí y cortamos la ejecución.
        // AFIP nunca se entera.
        throw new Error(stockCheck.message);
      }

      // 1. OBTENER EL CLIENTE
      const currentCustomer = this.saleSummary().customer;
      const totalAPagar = this.saleSummary().total - this.discount();
      const tipoFacturacion = this.saleSummary().billingType;

      let afipData: any = null;

      console.log('Cliente para la venta:', currentCustomer);

      let tituloTicket: string = '¡Venta (Remito) Guardada!';

      // 2. FACTURAR EN AFIP (¡SOLO SI NO ES REMITO!)
      if (tipoFacturacion !== 'SIN_FACTURA') {
        Swal.update({ title: 'Generando comprobante fiscal...' });
        const afipResponse = await this.saleService.billWithAFIP({
          total: totalAPagar,
          cliente: currentCustomer,
          tipoFactura: tipoFacturacion,
        });
        const afipData = {
          cae: afipResponse.cae,
          vencimientoCae: afipResponse.vencimientoCae,
          numeroFactura: afipResponse.numeroFactura,
          tipoFactura: afipResponse.tipoFactura,
        };
        tituloTicket = `¡Factura ${afipData.tipoFactura} N° ${afipData.numeroFactura} Generada!`;
      }

      //Guardamos la venta en Firebase, incluyendo los datos de AFIP si los hay
      Swal.update({ title: 'Guardando registros...' });
      const saleToSave = {
        balance_after_sale: 0,
        balance_before_sale: 0,
        cash_installment: 0,
        customer_id: currentCustomer?.cuit || '',
        customer_name: currentCustomer?.name || 'Consumidor Final',
        date_created: null,
        date_modified: null,
        discount: this.discount(),
        mp_installment: 0,
        payment_method: this.payments,
        products_list: this.saleSummary().products,
        status: 'completed',
        total: this.saleSummary().total,
        user_seller: {
          uid: '',
          authUserId: '',
          email: '',
          userName: '',
          roles: [],
          status: '',
        },
        is_local_sale: true,
        // Datos AFIP inyectados en tu base de datos
        afip_cae: afipData ? afipData.cae : null,
        afip_vencimiento_cae: afipData ? afipData.vencimientoCae : null,
        afip_numero_factura: afipData ? afipData.numeroFactura : null,
        afip_tipo_factura: afipData ? afipData.tipoFactura : 'REMITO NO FISCAL',
      };
      const result = await this.saleService.saveSale(saleToSave);
      if (!result.success) {
        // OJO AQUÍ: Si falla Firebase después de que AFIP aprobó,
        // tienes una factura válida pero no está guardada en tu BD local.
        // Por ahora lo atajamos con un error, pero es bueno saberlo.
        throw new Error(
          `Falló el guardado en la base de datos: ${result.message}`,
        );
      }

      Swal.close();
      // ---------------------------------------------------------
      // PASO 4: IMPRIMIR Y LIMPIAR
      // ---------------------------------------------------------
      const confirmPrint = await Swal.fire({
        title: tituloTicket,
        text: '¿Deseas imprimir el ticket?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, imprimir',
        cancelButtonText: 'No',
        allowOutsideClick: false,
      });

      if (confirmPrint.isConfirmed) {
        this.ticketService.printTicket(
          {
            products: this.saleSummary().products,
            total: this.saleSummary().total,
          },
          this.payments,
          this.discount(),
          //afipData,
        );
        Swal.fire({
          icon: 'info',
          title: 'Imprimiendo...',
          showConfirmButton: false,
          timer: 1500,
        });
      }

      this.notifyFocusBarcodeInput();
      this.notifyParent(); // Este llamará a tu nuevo cleanSale() que arreglamos antes
      this.resetTotalToPay();
    } catch (error: any) {
      Swal.close();
      console.error('Error en el flujo de venta:', error);
      Swal.fire({
        icon: 'error',
        title: 'Operación cancelada',
        text: error.message || 'La operación no pudo completarse.',
      });
      this.isLoading = false;
    }

    console.log('Venta finalizada con éxito:', {
      saleSummary: this.saleSummary,
      discount: this.discount,
      payments: this.payments,
    });
  }
  clearDiscountInput(event: FocusEvent): void {
    if (this.isDiscountInputFirstFocus) {
      const input = event.target as HTMLInputElement;
      input.value = ''; // Limpia el valor actual
      this.isDiscountInputFirstFocus = false;
      this.discount.set(0);
    }
  }
  clearPaymentInput(event: FocusEvent): void {
    if (this.isPaymentInputFirstFocus) {
      const input = event.target as HTMLInputElement;
      input.value = ''; // Limpia el valor actual
      this.isPaymentInputFirstFocus = false;
    }
  }

  restoreDefaultIfEmpty(event: FocusEvent, index?: number): void {
    const input = event.target as HTMLInputElement;
    if (input.value === '' || input.value === '0') {
      input.value = String(this.defaultAmountInputValue);
      if (input.id === 'discount-input') {
        this.isDiscountInputFirstFocus = true;
        this.discount.set(0);
      }
      if (input.id.includes('payment-')) {
        this.payments[index!].amount = this.defaultAmountInputValue;
        this.isPaymentInputFirstFocus = true;
      }
    }
  }
}
