import { Component, Input } from '@angular/core';
import { CurrencyPipe, UpperCasePipe } from '@angular/common';
import { Product } from '../../../../../../../../core/models/product-model';

@Component({
  selector: 'app-modal-products-table',
  imports: [CurrencyPipe, UpperCasePipe],
  templateUrl: './modal-products-table.component.html',
  styleUrl: './modal-products-table.component.css',
})
export class ModalProductsTableComponent {
  @Input() products: Product[] = [];
}
