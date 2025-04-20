import { SaleDto } from '../dtos/SaleDto';
import { Sale } from '../models/sale-model';
import { PaymentMethod } from '../models/paymentMethod-model';

export function mapToSaleDto(
  sale: Sale,
  saleId: string,
  paymentMethod: PaymentMethod[]
): SaleDto {
  return {
    id: saleId || '',
    balance_after_sale: Number(sale.balanceAfterSale),
    balance_before_sale: Number(sale.balanceBeforeSale),
    cash_installment: Number(sale.cashInstallment),
    customer_id: sale.customerId,
    customer_name: sale.customerName,
    date_created: null,
    date_modified: null,
    discount: Number(sale.discount),
    mp_installment: Number(sale.mpInstallment),
    payment_method: paymentMethod,
    products_list: sale.productsList,
    status: sale.status,
    total: Number(sale.total),
    user_seller: sale.userSeller,
  };
}
