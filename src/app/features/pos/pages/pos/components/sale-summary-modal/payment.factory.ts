// (En un archivo de fábrica, ej: payment.factory.ts)

import {
  PaymentMethod,
  PaymentType,
} from '../../../../../../core/models/paymentMethod-model';

export class PaymentFactory {
  /**
   * Crea un objeto de método de pago.
   * @param type El tipo de pago (ej: 'cash', 'mp').
   * @param amount El monto del pago.
   * @returns Un objeto PaymentMethod configurado.
   */
  public createPayment(type: PaymentType, amount: number): PaymentMethod {
    if (amount <= 0) {
      throw new Error('El monto del pago debe ser positivo.');
    }
    let name: string;
    switch (type) {
      case 'cash':
        name = 'Efectivo';
        break;
      case 'mp':
        name = 'MercadoPago';
        break;
      case 'brubank':
        name = 'Brubank';
        break;
      case 'nx':
        name = 'NaranjaX';
        break;
      default:
        name = 'Otro';
        break;
    }

    // La lógica de creación se centraliza aquí.
    // En el futuro, si crear un pago de MercadoPago requiere un paso extra,
    // se modifica solo en este lugar.
    const payment: PaymentMethod = {
      type: type,
      name: name,
      amount: amount,
    };

    return payment;
  }
}
