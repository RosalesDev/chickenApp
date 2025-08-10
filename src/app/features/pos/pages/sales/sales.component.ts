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
import { Product } from '../../../../core/models/product-model';
import { PaymentMethod } from '../../../../core/models/paymentMethod-model';
import { TicketService } from '../../services/ticket.service';

// Define la "forma" de todo el estado que necesita nuestra vista.
interface SalesViewModel {
  sales: SaleDto[];
  totalsByType: { [key: string]: number };
  pagination: {
    isFirstPage: boolean;
    isLastPage: boolean;
  };
  isLoading: boolean;
  totalItems: number;
  productList: Product[];
}

@Component({
  selector: 'app-sales',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss',
})
export class SalesComponent implements OnInit {
  private salesService = inject(SaleService);
  public ticketService = inject(TicketService);
  private fb = inject(FormBuilder);

  // --- Disparadores de Estado (Triggers) ---
  private filters$ = new BehaviorSubject<any>({});
  private paginationCursor$ = new BehaviorSubject<{
    direction: 'next' | 'prev' | 'initial';
    cursor: DocumentSnapshot<DocumentData> | null;
  }>({ direction: 'initial', cursor: null });

  private cursorStack: any[] = [];

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
        console.log(
          'Se ejecuta el switchMap con filtros y paginacion:',
          filters,
          pagination
        );
        const initialLoadingState: SalesViewModel = {
          sales: [],
          totalsByType: {},
          pagination: { isFirstPage: true, isLastPage: false },
          isLoading: true,
          totalItems: 0,
          productList: [],
        };

        return this.salesService
          .getSalesPaginated(filters, pagination.direction, pagination.cursor)
          .pipe(
            // El operador 'map' transforma el resultado del servicio en nuestro ViewModel
            map((result) => {
              // Actualizamos los cursores para la próxima paginación
              this.firstVisible = result.firstVisible;
              this.lastVisible = result.lastVisible;
              // 1. Aplanamos el array de pagos en uno solo
              const allPayments = result.sales.flatMap(
                (sale) => sale.payment_method
              );

              const products = this.salesService.getAggregatedSoldProducts(
                result.sales
              );
              const totalsByType = allPayments.reduce(
                (accumulator, payment) => {
                  const { name, amount } = payment;
                  // Si el tipo no existe en el acumulador, lo inicializa en 0, luego suma.
                  accumulator[name] = (accumulator[name] || 0) + amount;
                  return accumulator;
                },
                {} as { [key: string]: number }
              );

              console.log('totalsByType:', totalsByType);
              // Devolvemos el objeto completo que la vista necesita
              return {
                sales: result.sales,
                totalsByType: totalsByType,
                pagination: {
                  isFirstPage:
                    pagination.direction === 'initial' ||
                    pagination.cursor === null ||
                    this.cursorStack.length === 0,
                  isLastPage: result.sales.length < this.salesService.PAGE_SIZE,
                },
                isLoading: false,
                totalItems: result.sales.length,
                productList: products,
              };
            }),
            // startWith emite el estado de carga INMEDIATAMENTE cuando este stream se activa
            startWith(initialLoadingState),
            // catchError también debe devolver un objeto del tipo ViewModel
            catchError(() => {
              return of({
                sales: [],
                totalsByType: {},
                pagination: { isFirstPage: true, isLastPage: true },
                isLoading: false,
                totalItems: 0,
                productList: [],
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

  public getTotalByType(paymentList: PaymentMethod[]): {
    [key: string]: number;
  } {
    return paymentList.reduce((acc, payment) => {
      acc[payment.name] = (acc[payment.name] || 0) + payment.amount;
      return acc;
    }, {} as { [key: string]: number });
  }

  /**
   * Calcula la suma total de los montos de todos los métodos de pago
   * a través de una lista de ventas.
   * @param sales La lista de ventas (SaleDto[]).
   * @returns La suma total como un número.
   */
  public calculateTotalFromPaymentMethods(sales: SaleDto[]): number {
    // Usamos reduce para acumular el total de las ventas.
    return sales.reduce((totalAccumulator, currentSale) => {
      // Para cada venta, sumamos los montos de su lista de métodos de pago.
      const salePaymentTotal = currentSale.payment_method.reduce(
        (paymentAccumulator, paymentMethod) => {
          return paymentAccumulator + paymentMethod.amount;
        },
        0
      ); // El 0 es el valor inicial del acumulador de pagos.

      // Sumamos el total de pagos de la venta actual al acumulador general.
      return totalAccumulator + salePaymentTotal;
    }, 0); // El 0 es el valor inicial del acumulador total.
  }

  /**
   * Calcula la suma total de los descuentos aplicados en una lista de ventas.
   * @param sales La lista de ventas (SaleDto[]).
   * @returns La suma total de los descuentos como un número.
   */
  public calculateTotalDiscounts(sales: SaleDto[]): number {
    // Usamos reduce para acumular la suma de los descuentos de cada venta.
    return sales.reduce((totalDiscount, currentSale) => {
      return totalDiscount + currentSale.discount;
    }, 0); // El 0 es el valor inicial del acumulador.
  }

  /**
   * Calcula la suma total de los descuentos aplicados en una lista de ventas.
   * @param sales La lista de ventas (SaleDto[]).
   * @returns La suma total de los descuentos como un número.
   */
  public calculateTotalWithoutDiscount(products: Product[]): number {
    // Usamos reduce para acumular la suma de los descuentos de cada venta.
    return products.reduce((total, currentProduct) => {
      return total + currentProduct.subtotal!;
    }, 0); // El 0 es el valor inicial del acumulador.
  }

  loadTodaysSales(): void {
    this.cursorStack = [];
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
    this.cursorStack.push(this.firstVisible);
    this.paginationCursor$.next({
      direction: 'next',
      cursor: this.lastVisible,
    });
  }

  prevPage(): void {
    if (!this.firstVisible) return;
    const previousCursor = this.cursorStack.pop();
    this.paginationCursor$.next({
      direction: 'prev',
      cursor: previousCursor,
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
