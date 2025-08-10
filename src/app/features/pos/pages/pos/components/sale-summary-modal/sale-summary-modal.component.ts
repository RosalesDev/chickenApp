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

  saleSummary = input<{ products: any[]; total: number }>({
    products: [],
    total: 0,
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
    payment: PaymentMethod = { type: 'cash', amount: 0, name: 'Efectivo' }
  ) {
    this.payments.push(payment);
  }

  public addTotalPayment(type: PaymentType) {
    this.isPaymentInputFirstFocus = false;

    try {
      // Usamos la fábrica para crear el objeto de pago
      const payment = this.paymentFactory.createPayment(
        type,
        this.totalToPay()
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

  finalizeSale() {
    Swal.fire({
      title: 'Finalizando venta...',
      text: 'Por favor, espere un momento.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    this.saleService
      .saveSale({
        balance_after_sale: 0,
        balance_before_sale: 0,
        cash_installment: 0,
        customer_id: '',
        date_created: null,
        date_modified: null,
        customer_name: '',
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
      })
      .then((result) => {
        Swal.close();
        if (!result.success) {
          console.error('Error al guardar la venta:', result.message);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Ocurrió un error al finalizar la venta: ${result.message}`,
          });
          this.isLoading = false;
          return;
        }
        Swal.fire({
          icon: 'success',
          title: 'Venta finalizada',
          text: 'Venta guardada',
          showConfirmButton: false,
          timer: 1500,
        });
        this.ticketService.printTicket(
          this.saleSummary(),
          Array.from(this.payments),
          this.discount()
        );
        this.notifyFocusBarcodeInput(); // Emitir el evento para enfocar el input de código de barras
        this.notifyParent(); // Emitir el evento para limpiar la venta
        this.resetTotalToPay();
      });
    // .catch((error) => {
    //   Swal.close();
    //   console.error('Error al guardar la venta:', error);
    //   Swal.fire({
    //     icon: 'error',
    //     title: 'Error',
    //     text: 'Ocurrió un error al finalizar la venta.',
    //   });
    //   this.isLoading = false;
    //   return;
    // });

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
