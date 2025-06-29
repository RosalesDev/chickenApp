import { Product } from '../models/product-model';
import { User } from '../models/user-model';
import { PaymentMethod } from '../models/paymentMethod-model';

export interface SaleDto {
  id?: string;
  balance_after_sale: number | 0;
  balance_before_sale: number | 0;
  cash_installment: number;
  customer_id: string | '';
  customer_name: string | '';
  date_created: string | null;
  date_modified: string | null;
  discount: number;
  mp_installment: number;
  payment_method: PaymentMethod[];
  products_list: Product[];
  status: string;
  total: number;
  user_seller: User;
  is_local_sale: boolean;
}

export interface SalesFilters {
  startDate?: Date;
  endDate?: Date;
  vendedorId?: string;
  // Puedes agregar cualquier otro filtro que necesites en el futuro
  // por ejemplo: estado?: 'completada' | 'pendiente';
}
