import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HasRoleDirective } from '../../../../shared/directives/has-role.directive';
import { SaleService } from '../../services/sale.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-invoice-query',
  standalone: true,
  imports: [CommonModule, FormsModule, HasRoleDirective],
  templateUrl: './invoice-query.component.html',
  styleUrls: [],
})
export class InvoiceQueryComponent {
  private saleService = inject(SaleService);

  // Variables del formulario
  ptoVta = 2;
  cbteTipo = 6; // Por defecto Factura B
  nroCbte: number | null = null;

  // Señal para guardar el resultado
  invoiceData = signal<any>(null);
  isLoading = signal<boolean>(false);

  // --- DICCIONARIOS DE TRADUCCIÓN DE AFIP ---

  getTipoComprobante(id: number): string {
    const tipos: { [key: number]: string } = {
      1: 'Factura A',
      6: 'Factura B',
      11: 'Factura C',
      3: 'Nota de Crédito A',
      8: 'Nota de Crédito B',
    };
    return tipos[id] || `Desconocido (${id})`;
  }

  getDocumento(id: number): string {
    const docs: { [key: number]: string } = {
      80: 'CUIT',
      96: 'DNI',
      99: 'Sin Identificar (Consumidor Final Anónimo)',
    };
    return docs[id] || `Otro (${id})`;
  }

  getCondicionIva(id: number | string): string {
    const ivas: { [key: string]: string } = {
      '1': 'Responsable Inscripto',
      '4': 'Exento',
      '5': 'Consumidor Final',
      '6': 'Monotributista',
    };
    return ivas[id.toString()] || `Desconocida (${id})`;
  }

  getConcepto(id: number): string {
    const conceptos: { [key: number]: string } = {
      1: 'Productos / Bienes',
      2: 'Servicios',
      3: 'Productos y Servicios',
    };
    return conceptos[id] || `Desconocido (${id})`;
  }

  getResultado(resultado: string): string {
    return resultado === 'A'
      ? 'Aprobado ✅'
      : resultado === 'R'
        ? 'Rechazado ❌'
        : resultado;
  }

  formatoFecha(fecha: string): string {
    if (!fecha || fecha.length !== 8) return fecha;
    // Convierte "20260706" a "06/07/2026"
    return `${fecha.substring(6, 8)}/${fecha.substring(4, 6)}/${fecha.substring(0, 4)}`;
  }

  // --- LÓGICA DE BÚSQUEDA ---

  async searchInvoice() {
    if (!this.ptoVta || !this.cbteTipo || !this.nroCbte) {
      Swal.fire('Atención', 'Completá todos los campos', 'warning');
      return;
    }

    this.isLoading.set(true);
    this.invoiceData.set(null);

    try {
      const data = await this.saleService.consultInvoiceWithAFIP(
        this.ptoVta,
        this.cbteTipo,
        this.nroCbte,
      );
      this.invoiceData.set(data);
    } catch (error: any) {
      Swal.fire(
        'Error',
        error.message || 'No se encontró la factura en ARCA',
        'error',
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
