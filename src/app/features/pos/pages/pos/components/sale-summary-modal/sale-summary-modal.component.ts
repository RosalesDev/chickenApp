import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  input,
  Input,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalProductsTableComponent } from './components/modal-products-table/modal-products-table.component';

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

  saleSummary = input<{ products: any[]; total: number }>({
    products: [],
    total: 0,
  });

  discount = signal(0);
  payments: { type: string; amount: WritableSignal<number> }[] = [
    { type: 'cash', amount: signal(0) },
  ];
  paymentSum = signal(this.payments.reduce((sum, p) => sum + p.amount(), 0));
  totalToPay: Signal<number> = computed(() => {
    console.log('total dentro del computed: ', this.saleSummary().total);
    const discountPercentage =
      (this.saleSummary().total * this.discount()) / 100;
    const totalWithDiscount = this.saleSummary().total - discountPercentage;
    return totalWithDiscount - this.paymentSum();
  });
  defaultAmountInputValue = 0;
  isDiscountInputFirstFocus = true;
  isPaymentInputFirstFocus = true;

  resetTotalToPay() {
    this.discount.set(0);
    this.payments = [];
    this.paymentSum.set(0);
  }

  setPaymentAmount(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    this.payments[index].amount.set(Number(input.value));
    this.paymentSum.set(this.payments.reduce((sum, p) => sum + p.amount(), 0));
  }

  addPayment() {
    this.payments.push({ type: 'cash', amount: signal(0) });
  }

  removePayment(index: number) {
    this.payments.splice(index, 1);
    this.paymentSum.set(this.payments.reduce((sum, p) => sum + p.amount(), 0));
  }

  finalizeSale() {
    console.log('Venta finalizada con éxito:', {
      saleSummary: this.saleSummary,
      discount: this.discount,
      payments: this.payments,
    });
    // Aquí puedes emitir un evento o realizar acciones adicionales.
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
        this.payments[index!].amount.set(this.defaultAmountInputValue);
        this.isPaymentInputFirstFocus = true;
      }
    }
  }
}
