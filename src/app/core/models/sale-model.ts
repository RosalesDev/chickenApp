import { Product } from './product-model';
import { User } from './user-model';

export class Sale {
  customerId: string;
  customerName: string;
  dateCreated: Date;
  dateModified: Date;
  productsList: Product[];
  userSeller: User;
  status: string;
  cashInstallment: number;
  mpInstallment: number;
  subtotal: number;
  discount: number;
  total: number;
  balanceBeforeSale: number;
  balanceAfterSale: number;

  constructor() {
    this.customerId = '';
    this.customerName = '';
    this.dateCreated = new Date();
    this.dateModified = new Date();
    this.productsList = [];
    this.userSeller = new User();
    this.status = 'pending';
    this.cashInstallment = 0;
    this.mpInstallment = 0;
    this.subtotal = 0;
    this.discount = 0;
    this.total = 0;
    this.balanceBeforeSale = 0;
    this.balanceAfterSale = 0;
  }
}
