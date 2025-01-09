import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalProductsTableComponent } from './components/modal-products-table/modal-products-table.component';

@Component({
  selector: 'app-sale-summary-modal',
  imports: [CommonModule, FormsModule, ModalProductsTableComponent],
  templateUrl: './sale-summary-modal.component.html',
  styleUrl: './sale-summary-modal.component.css',
})
export class SaleSummaryModalComponent {
  @Input() saleSummary: { products: any[]; total: number } = {
    products: [],
    total: 0,
  };
  discount: number = 0;
  payments: { type: string; amount: number }[] = [{ type: 'cash', amount: 0 }];
  remainingTotal: number = 0;
  defaultAmountInputValue = 0;
  isDiscountInputFirstFocus = true;
  isPaymentInputFirstFocus = true;

  ngOnInit() {
    this.updateTotal();
  }

  updateTotal() {
    const discountAmount = (this.saleSummary.total * this.discount) / 100;
    const totalWithDiscount = this.saleSummary.total - discountAmount;
    const paymentSum = this.payments.reduce((sum, p) => sum + p.amount, 0);
    this.remainingTotal = totalWithDiscount - paymentSum;
  }

  addPayment() {
    this.payments.push({ type: 'cash', amount: 0 });
  }

  removePayment(index: number) {
    this.payments.splice(index, 1);
    this.updateTotal();
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
      this.discount = 0;
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
        this.discount = 0;
      }
      if (input.id.includes('payment-')) {
        this.payments[index!].amount = this.defaultAmountInputValue;
        this.isPaymentInputFirstFocus = true;
      }
    }
  }
}
