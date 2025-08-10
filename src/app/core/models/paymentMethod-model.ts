export type PaymentType = 'cash' | 'mp' | 'brubank' | 'nx' | 'cc';

export interface PaymentMethod {
  type: string;
  name: string;
  amount: number;
}
