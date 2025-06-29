import {
  Component,
  inject,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { SaleService } from '../../services/sale.service';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { DocumentData, DocumentSnapshot } from 'firebase/firestore';
import { SaleDto } from '../../../../core/dtos/SaleDto';
import { CommonModule } from '@angular/common';

// --- (NUEVO) INTERFAZ PARA EL VIEWMODEL ---
// Define la "forma" de todo el estado que necesita nuestra vista.
interface SalesViewModel {
  sales: SaleDto[];
  pagination: {
    isFirstPage: boolean;
    isLastPage: boolean;
  };
  isLoading: boolean;
  totalItems: number;
}

@Component({
  selector: 'app-sales',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss',
})
export class SalesComponent implements OnInit {
  private salesService = inject(SaleService);
  private fb = inject(FormBuilder);

  // --- Disparadores de Estado (Triggers) ---
  private filters$ = new BehaviorSubject<any>({});
  private paginationCursor$ = new BehaviorSubject<{
    direction: 'next' | 'prev' | 'initial';
    cursor: DocumentSnapshot<DocumentData> | null;
  }>({ direction: 'initial', cursor: null });

  // --- (NUEVO) ÚNICO STREAM PARA LA VISTA: vm$ ---
  public vm$!: Observable<SalesViewModel>;

  // --- Estado local que no forma parte del stream principal ---
  public selectedSale: WritableSignal<SaleDto | null> = signal(null);
  public filterForm!: FormGroup;

  // Propiedades para mantener los cursores de paginación entre llamadas
  private lastVisible: DocumentSnapshot<DocumentData> | null = null;
  private firstVisible: DocumentSnapshot<DocumentData> | null = null;

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
    });

    // Combinamos los filtros para resetear la paginación
    const filtersWithPaginationReset$ = this.filters$.pipe(
      tap(() =>
        this.paginationCursor$.next({ direction: 'initial', cursor: null })
      )
    );

    // --- LÓGICA PRINCIPAL REFACTORIZADA ---
    this.vm$ = filtersWithPaginationReset$.pipe(
      switchMap((filters) =>
        this.paginationCursor$.pipe(
          map((pagination) => ({ filters, pagination }))
        )
      ),
      switchMap(({ filters, pagination }) => {
        // En lugar de un BehaviorSubject, el estado de carga se maneja dentro del stream
        const initialLoadingState: SalesViewModel = {
          sales: [],
          pagination: { isFirstPage: true, isLastPage: false },
          isLoading: true,
          totalItems: 0,
        };

        return this.salesService
          .getSalesPaginated(filters, pagination.direction, pagination.cursor)
          .pipe(
            // El operador 'map' transforma el resultado del servicio en nuestro ViewModel
            map((result) => {
              // Actualizamos los cursores para la próxima paginación
              this.firstVisible = result.firstVisible;
              this.lastVisible = result.lastVisible;
              console.log('firstVisible:', this.firstVisible);
              console.log('lastVisible:', this.lastVisible);

              // Devolvemos el objeto completo que la vista necesita
              return {
                sales: result.sales,
                pagination: {
                  isFirstPage:
                    pagination.direction === 'initial' ||
                    pagination.cursor === null,
                  isLastPage: result.sales.length < this.salesService.PAGE_SIZE, // Asumiendo PAGE_SIZE = 12
                },
                isLoading: false,
                totalItems: result.sales.length,
              };
            }),
            // startWith emite el estado de carga INMEDIATAMENTE cuando este stream se activa
            startWith(initialLoadingState),
            // catchError también debe devolver un objeto del tipo ViewModel
            catchError(() => {
              return of({
                sales: [],
                pagination: { isFirstPage: true, isLastPage: true },
                isLoading: false,
                totalItems: 0,
              });
            })
          );
      }),
      // shareReplay(1) es crucial para evitar múltiples suscripciones si usas `vm$ | async` varias veces
      shareReplay(1)
    );

    this.loadTodaysSales();
  }

  public selectSale(sale: SaleDto | null): void {
    this.selectedSale.set(sale);
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
    this.filters$.next(filters);
  }

  nextPage(): void {
    if (!this.lastVisible) return;
    this.paginationCursor$.next({
      direction: 'next',
      cursor: this.lastVisible,
    });
  }

  prevPage(): void {
    if (!this.firstVisible) return;
    this.paginationCursor$.next({
      direction: 'prev',
      cursor: this.firstVisible,
    });
  }

  exportToCsv(): void {}

  // exportToCsv(): void {
  //   this.salesResult$.pipe(first()).subscribe((result) => {
  //     const sales = result.sales;
  //     if (sales.length === 0) {
  //       alert('No hay ventas para exportar.');
  //       return;
  //     }

  //     // CAMBIO: Adaptar las cabeceras y los datos al nuevo DTO
  //     const headers = [
  //       'ID',
  //       'Fecha Creación',
  //       'Cliente',
  //       'Total',
  //       'Vendedor',
  //       'Estado',
  //     ];
  //     const csvData = sales.map((sale) =>
  //       [
  //         sale.id,
  //         // Usamos el string de fecha directamente, quizás cortándolo para legibilidad
  //         sale.date_created
  //           ? new Date(sale.date_created).toLocaleDateString('es-AR')
  //           : 'N/A',
  //         `"${sale.customer_name.replace(/"/g, '""')}"`, // Escapar comillas dobles en nombres
  //         sale.total,
  //         `"${sale.user_seller?.userName || 'N/A'}"`, // Asumiendo que User tiene una prop 'name'
  //         sale.status,
  //       ].join(',')
  //     );

  //     const csvContent = [headers.join(','), ...csvData].join('\n');
  //     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  //     const link = document.createElement('a');
  //     const url = URL.createObjectURL(blob);
  //     link.setAttribute('href', url);
  //     link.setAttribute(
  //       'download',
  //       `ventas_${new Date().toISOString().split('T')[0]}.csv`
  //     );
  //     link.style.visibility = 'hidden';
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //   });
  // }
}
