import { Component, inject, OnInit } from '@angular/core';
import { PaginatedSalesResult, SaleService } from '../../services/sale.service';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  catchError,
  first,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { SaleDto } from '../../../../core/dtos/SaleDto';
import { Modal } from 'bootstrap';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sales',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss',
})
export class SalesComponent implements OnInit {
  private salesService = inject(SaleService);
  private fb = inject(FormBuilder);

  // --- State Subjects ---
  private filters$ = new BehaviorSubject<any>({});
  private paginationCursor$ = new BehaviorSubject<{
    direction: 'next' | 'prev' | 'initial';
    cursor: DocumentSnapshot<DocumentData> | null;
  }>({ direction: 'initial', cursor: null });

  // --- Observables for the template ---
  salesResult$!: Observable<PaginatedSalesResult>;
  isLoading$ = new BehaviorSubject<boolean>(true);

  // --- State variables ---
  selectedSale: SaleDto | null = null;
  saleModal!: Modal;
  filterForm!: FormGroup;

  // --- Pagination state ---
  lastVisible: DocumentSnapshot<DocumentData> | null = null;
  firstVisible: DocumentSnapshot<DocumentData> | null = null;
  isFirstPage = true;
  isLastPage = false;

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
    });

    this.saleModal = new Modal('#saleDetailModal');

    // Combina los filtros y la paginación en un solo stream
    this.salesResult$ = this.filters$.pipe(
      // Cada vez que los filtros cambian, resetea la paginación
      tap(() => {
        this.paginationCursor$.next({ direction: 'initial', cursor: null });
        this.isFirstPage = true;
      }),
      // Combina con el stream de paginación
      switchMap((filters) =>
        this.paginationCursor$.pipe(
          map((pagination) => ({ filters, pagination }))
        )
      ),
      // Llama al servicio con la combinación de filtros y paginación
      switchMap(({ filters, pagination }) => {
        this.isLoading$.next(true);
        return this.salesService
          .getSalesPaginated(filters, pagination.direction, pagination.cursor)
          .pipe(
            tap((result) => {
              console.log(
                `Sales result for direction ${pagination.direction}:`,
                result
              );
              this.isLoading$.next(false);
              this.lastVisible = result.lastVisible;
              this.firstVisible = result.firstVisible;
              // Si la página tiene menos elementos que el tamaño de página, es la última.
              this.isLastPage = result.sales.length < 12; // Asumiendo PAGE_SIZE = 12
            }),
            catchError(() => {
              this.isLoading$.next(false);
              return of({ sales: [], lastVisible: null, firstVisible: null });
            })
          );
      })
    );

    // Carga inicial con las ventas del día
    this.loadTodaysSales();
  }

  loadTodaysSales(): void {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    this.filterForm.patchValue({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
    this.applyFilters();
  }

  applyFilters(): void {
    const formValue = this.filterForm.value;
    const filters: any = {};
    if (formValue.startDate) {
      filters.startDate = new Date(formValue.startDate + 'T00:00:00');
    }
    if (formValue.endDate) {
      filters.endDate = new Date(formValue.endDate + 'T23:59:59');
    }
    console.log('Applying filters:', filters);
    this.filters$.next(filters);
  }

  nextPage(): void {
    if (!this.lastVisible) return;
    this.isFirstPage = false;
    this.paginationCursor$.next({
      direction: 'next',
      cursor: this.lastVisible,
    });
  }

  prevPage(): void {
    if (!this.firstVisible) return;
    // La lógica de la primera página se maneja al cambiar los filtros
    // Podrías necesitar una lógica más robusta si guardas el historial de cursores
    this.isLastPage = false;
    this.paginationCursor$.next({
      direction: 'prev',
      cursor: this.firstVisible,
    });
  }

  openSaleModal(sale: SaleDto): void {
    this.selectedSale = sale;
    this.saleModal.show();
  }

  exportToCsv(): void {
    this.salesResult$.pipe(first()).subscribe((result) => {
      const sales = result.sales;
      if (sales.length === 0) {
        alert('No hay ventas para exportar.');
        return;
      }

      // CAMBIO: Adaptar las cabeceras y los datos al nuevo DTO
      const headers = [
        'ID',
        'Fecha Creación',
        'Cliente',
        'Total',
        'Vendedor',
        'Estado',
      ];
      const csvData = sales.map((sale) =>
        [
          sale.id,
          // Usamos el string de fecha directamente, quizás cortándolo para legibilidad
          sale.date_created
            ? new Date(sale.date_created).toLocaleDateString('es-AR')
            : 'N/A',
          `"${sale.customer_name.replace(/"/g, '""')}"`, // Escapar comillas dobles en nombres
          sale.total,
          `"${sale.user_seller?.userName || 'N/A'}"`, // Asumiendo que User tiene una prop 'name'
          sale.status,
        ].join(',')
      );

      const csvContent = [headers.join(','), ...csvData].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `ventas_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
}
