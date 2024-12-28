import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sale-summary-modal',
  imports: [CommonModule, FormsModule],
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
}
