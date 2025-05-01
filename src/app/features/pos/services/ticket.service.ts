import { Injectable } from '@angular/core';
import { Product } from '../../../core/models/product-model';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  constructor() {}

  async printTicket(productList: Product[]) {
    const url = 'http://localhost:3000/print';
    const ticketData = {
      title: 'Ticket de venta',
      logo: '',
      barcode: '',
      qr: 'https://www.google.com.ar',
      products: productList,
      date: new Date().toLocaleString(),
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        throw new Error('Error al imprimir el ticket');
      }

      console.log('Ticket impreso correctamente');
    } catch (error) {
      console.error('Error al imprimir el ticket:', error);
    }
  }
}
