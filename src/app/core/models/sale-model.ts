import { Product } from './product-model';

export interface Sale {
  customerId: string;
  customerName: string;
  dateCreated: Date;
  dateModified: Date;
  productsList: Product[];
  userSeller: string;
  status: string;
  cashInstallment: number;
  mpInstallment: number;
  subtotal: number;
  discount: number;
  total: number;
  balanceBeforeSale: number;
  balanceAfterSale: number;
}
