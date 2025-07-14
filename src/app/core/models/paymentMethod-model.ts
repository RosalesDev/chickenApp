export type PaymentType = 'cash' | 'mp' | 'brubank' | 'nx';

export interface PaymentMethod {
  type: string;
  name: string;
  amount: number;
}
