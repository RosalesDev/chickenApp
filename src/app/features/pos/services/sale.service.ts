import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  endBefore,
  getDocs,
  getFirestore,
  limit,
  limitToLast,
  orderBy,
  query,
  Query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { SaleDto, SalesFilters } from '../../../core/dtos/SaleDto';
import { from, map, Observable } from 'rxjs';
import { Sale } from '../../../core/models/sale-model';

export interface PaginatedSalesResult {
  sales: SaleDto[];
  lastVisible: DocumentSnapshot<DocumentData> | null;
  firstVisible: DocumentSnapshot<DocumentData> | null;
}

@Injectable({
  providedIn: 'root',
})
export class SaleService {
  constructor() {}

  private firestore = getFirestore();
  private salesCollection = collection(this.firestore, 'sales');
  private productsCollection = collection(this.firestore, 'products');
  private readonly PAGE_SIZE = 12; // Define el tamaño de la página aquí

  /* -------------------------------------------------------------------------- */
  /*                    OBTENER VENTAS PAGINADAS Y FILTRADAS                    */
  /* -------------------------------------------------------------------------- */

  /**
   * Obtiene las ventas de forma paginada aplicando filtros dinámicos.
   * @param filters Objeto con los filtros a aplicar.
   * @param direction 'next', 'prev' o 'initial'.
   * @param cursor El documento de referencia para paginar.
   * @returns Un Observable con la página de ventas y los cursores.
   */
  getSalesPaginated(
    filters: SalesFilters,
    direction: 'next' | 'prev' | 'initial' = 'initial',
    cursor: DocumentSnapshot<DocumentData> | null = null
  ): Observable<PaginatedSalesResult> {
    // 1. Construye la consulta base con los filtros, igual que antes.
    let q = this.buildFilteredQuery(filters);
    // let q2 = this.buildFilteredQuery(filters);

    // 2. Aplica la lógica de paginación
    switch (direction) {
      case 'next':
        q = query(q, startAfter(cursor), limit(this.PAGE_SIZE));
        break;
      case 'prev':
        // Para "prev", invertimos el orden y usamos endBefore. Luego revertimos el resultado.
        // Nota: la paginación hacia atrás en Firestore es más compleja.
        // Este es un enfoque común.
        const prevQuery = this.buildFilteredQuery(filters, 'asc');
        q = query(prevQuery, endBefore(cursor), limitToLast(this.PAGE_SIZE));
        break;
      default: // initial
        q = query(q, limit(this.PAGE_SIZE));
        break;
    }
    console.log(`Query for direction ${direction}:`, q);
    // 3. Ejecuta la consulta y mapea los resultados
    return from(getDocs(q)).pipe(
      map((snapshot) => {
        const salesDocs =
          direction === 'prev' ? snapshot.docs.reverse() : snapshot.docs;

        const sales = salesDocs.map((doc) => {
          const data = doc.data();
          console.log(`Sale data for doc ${doc.id}:`, data);

          // ---- INICIO DEL MAPEO A SaleDto ----
          const saleDto: SaleDto = {
            id: doc.id,
            balance_after_sale: data['balance_after_sale'] || 0,
            balance_before_sale: data['balance_before_sale'] || 0,
            cash_installment: data['cash_installment'] || 0,
            customer_id: data['customer_id'] || '',
            customer_name: data['customer_name'] || '',
            // Convierte el Timestamp de Firestore a un string ISO, o null si no existe
            date_created:
              (data['date_created'] as Timestamp)?.toDate().toISOString() ||
              null,
            date_modified:
              (data['date_modified'] as Timestamp)?.toDate().toISOString() ||
              null,
            discount: data['discount'] || 0,
            mp_installment: data['mp_installment'] || 0,
            payment_method: data['payment_method'] || [],
            products_list: data['products_list'] || [],
            status: data['status'] || 'unknown',
            total: data['total'] || 0,
            user_seller: data['user_seller'] || null, // Asegúrate que el tipo User coincida
          };
          // ---- FIN DEL MAPEO ----

          return saleDto;
        });
        console.log(`Mapped sales:`, sales);

        return {
          sales,
          lastVisible: snapshot.docs[snapshot.docs.length - 1] ?? null,
          firstVisible: snapshot.docs[0] ?? null,
        };
      })
    );
  }

  /**
   * Método auxiliar para construir la consulta base con filtros.
   * Se puede reutilizar para paginación y exportación.
   */
  buildFilteredQuery(
    filters: SalesFilters,
    sortOrder: 'desc' | 'asc' = 'desc'
  ): Query<DocumentData> {
    let q: Query<DocumentData> = query(this.salesCollection);

    // Siempre ordenar por fecha para que los filtros de rango y paginación funcionen
    q = query(q, orderBy('date_created', sortOrder));

    if (filters.startDate) {
      q = query(q, where('date_created', '>=', filters.startDate));
    }
    if (filters.endDate) {
      q = query(q, where('date_created', '<=', filters.endDate));
    }
    // ... otros filtros aquí

    return q;
  }

  /* -------------------------------------------------------------------------- */
  /*                GUARDAR VENTA Y ACTUALIZAR STOCK DE PRODUCTOS               */
  /* -------------------------------------------------------------------------- */

  async saveSale(
    sale: SaleDto
  ): Promise<{ success: boolean; message: string; id?: string }> {
    try {
      const saleWithTimestamps = {
        ...sale,
      };

      const saleRef = doc(this.salesCollection);

      await runTransaction(this.firestore, async (transaction) => {
        const productSnapshots: {
          ref: DocumentReference;
          data: any;
          newAvailability: number;
        }[] = [];
        // PRIMERO: leer todos los productos y validar stock
        for (const product of sale.products_list) {
          const productRef = doc(this.productsCollection, product.id as string);
          const productSnap = await transaction.get(productRef);

          if (!productSnap.exists()) {
            throw new Error(`Error al buscar el producto en la base de datos`);
          }

          const currentAvailability =
            productSnap.data()['availability_in_deposit'] ?? 0;
          const newAvailability = currentAvailability - product.quantity;

          if (newAvailability < 0) {
            throw new Error(
              `Stock insuficiente para el producto: ${product.name.toLocaleUpperCase()}`
            );
          }

          productSnapshots.push({
            ref: productRef,
            data: productSnap.data(),
            newAvailability,
          });
        }
        // DESPUÉS: actualizar los productos
        for (const item of productSnapshots) {
          transaction.update(item.ref, {
            availability_in_deposit: item.newAvailability,
          });
        }

        // FINALMENTE: guardar la venta sin timestamps
        transaction.set(saleRef, {
          ...sale,
          createdAt: null,
          updatedAt: null,
        });
      });
      // Actualizar los timestamps después de la transacción
      // Esto es necesario porque los timestamps no se pueden establecer dentro de una transacción
      await updateDoc(saleRef, {
        date_created: serverTimestamp(),
        date_modified: serverTimestamp(),
      });

      return {
        success: true,
        message: 'Venta guardada y stock actualizado correctamente',
        id: saleRef.id,
      };
    } catch (error: any) {
      console.error('Error al guardar la venta:', error);

      return {
        success: false,
        message: error.message || 'Error desconocido al guardar la venta',
      };
    }
  }
}
