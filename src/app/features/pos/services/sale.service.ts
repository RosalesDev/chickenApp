import { Injectable } from '@angular/core';
import { db } from '../../../config/firebase.config';
import {
  collection,
  doc,
  getDoc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  endAt,
  getDocs,
  limit,
  limitToLast,
  orderBy,
  query,
  Query,
  QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { SaleDto, SalesFilters } from '../../../core/dtos/SaleDto';
import { from, map, Observable, throwError } from 'rxjs';
import { Product } from '../../../core/models/product-model';

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

  private salesCollection = collection(db, 'sales');
  private productsCollection = collection(db, 'products');
  readonly PAGE_SIZE = 5; // Define el tamaño de la página aquí
  // Define el rango máximo de días permitidos para la consulta.
  private readonly MAX_DATE_RANGE_IN_DAYS = 90;

  /**
   * Mapea un DocumentSnapshot de Firestore a un objeto SaleDto.
   */
  private mapDocToSaleDto(doc: QueryDocumentSnapshot<DocumentData>): SaleDto {
    const data = doc.data();
    return {
      id: doc.id,
      balance_after_sale: data['balance_after_sale'] || 0,
      balance_before_sale: data['balance_before_sale'] || 0,
      cash_installment: data['cash_installment'] || 0,
      customer_id: data['customer_id'] || '',
      customer_name: data['customer_name'] || '',
      // Convierte el Timestamp de Firestore a un string ISO, o null si no existe
      date_created:
        (data['date_created'] as Timestamp)?.toDate().toISOString() || null,
      date_modified:
        (data['date_modified'] as Timestamp)?.toDate().toISOString() || null,
      discount: data['discount'] || 0,
      mp_installment: data['mp_installment'] || 0,
      payment_method: data['payment_method'] || [],
      products_list: data['products_list'] || [],
      status: data['status'] || 'unknown',
      total: data['total'] || 0,
      user_seller: data['user_seller'] || null, // Asegúrate que el tipo User coincida
      is_local_sale: data['is_local_sale'] || false, // Asegúrate que el tipo booleano coincida
    };
  }

  /**
   * Obtiene todas las ventas dentro de un rango de fechas específico.
   * Lanza un error si el rango de fechas excede el máximo permitido.
   * @param startDate - La fecha de inicio del rango.
   * @param endDate - La fecha de fin del rango.
   * @returns Un Observable que emite un array de ventas (SaleDto[]).
   */
  getSalesByDateRange(filters: SalesFilters): Observable<SaleDto[]> {
    // 1. 🛡️ **Validación del Rango de Fechas**
    const diffInMs = filters.endDate!.getTime() - filters.startDate!.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInDays > this.MAX_DATE_RANGE_IN_DAYS) {
      // Usamos throwError de RxJS para manejar el error de forma reactiva.
      return throwError(
        () =>
          new Error(
            `El rango de fechas excede el máximo permitido de ${this.MAX_DATE_RANGE_IN_DAYS} días.`,
          ),
      );
    }

    let q = this.buildFilteredQuery(filters);

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        // Mapeamos cada documento al DTO 'SaleDto'
        return snapshot.docs.map((doc) => {
          const data = doc.data();
          const saleDto: SaleDto = this.mapDocToSaleDto(doc);
          return saleDto;
        });
      }),
    );
  }

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
    cursor: DocumentSnapshot<DocumentData> | null = null,
  ): Observable<PaginatedSalesResult> {
    // 1. Construye la consulta base con los filtros, igual que antes.
    let q = this.buildFilteredQuery(filters);
    console.log('direction:', direction);

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
        q = query(prevQuery, endAt(cursor), limitToLast(this.PAGE_SIZE));
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

        // const salesDocs = snapshot.docs;

        const sales = salesDocs.map((doc) => {
          const data = doc.data();
          console.log(`Sale data for doc ${doc.id}:`, data);

          const saleDto: SaleDto = this.mapDocToSaleDto(doc);
          return saleDto;
        });
        console.log(`Mapped sales:`, sales);

        return {
          sales,
          lastVisible: salesDocs[snapshot.docs.length - 1] ?? null,
          firstVisible: salesDocs[0] ?? null,
        };
      }),
    );
  }

  /**
   * Método auxiliar para construir la consulta base con filtros.
   * Se puede reutilizar para paginación y exportación.
   */
  buildFilteredQuery(
    filters: SalesFilters,
    sortOrder: 'desc' | 'asc' = 'desc',
  ): Query<DocumentData> {
    let q: Query<DocumentData> = query(this.salesCollection);

    // Siempre ordenar por fecha para que los filtros de rango y paginación funcionen
    q = query(q, where('is_local_sale', '==', true));
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

  /**
   * Procesa una lista de ventas para obtener un resumen agregado de productos vendidos.
   *
   * @param sales - Un arreglo de objetos SaleDto.
   * @returns Un arreglo de Product con cantidades y subtotales agregados.
   */
  getAggregatedSoldProducts(sales: SaleDto[]): Product[] {
    // Usamos un Map para un rendimiento óptimo al buscar productos existentes.
    // La clave será el ID del producto (string), y el valor será el objeto Product agregado.
    const aggregatedProductsMap = new Map<string, Product>();

    // 1. Iterar sobre cada venta en la lista de ventas.
    for (const sale of sales) {
      // 2. Iterar sobre cada producto dentro de la lista de productos de la venta.
      for (const product of sale.products_list) {
        // Es crucial tener un ID para identificar unívocamente cada producto.
        if (!product.id) {
          console.warn(
            'Se encontró un producto sin ID y será omitido:',
            product,
          );
          continue; // Omitir este producto y continuar con el siguiente.
        }

        // 3. Verificar si el producto ya fue agregado a nuestro mapa.
        const existingProduct = aggregatedProductsMap.get(product.id);

        if (existingProduct) {
          // 4a. Si el producto ya existe, actualizamos sus valores.
          existingProduct.quantity += product.quantity;

          // Nos aseguramos de que los subtotales sean números antes de sumarlos.
          const currentSubtotal = existingProduct.subtotal ?? 0;
          const newSubtotal = product.subtotal ?? 0;
          existingProduct.subtotal = currentSubtotal + newSubtotal;
        } else {
          // 4b. Si es la primera vez que vemos este producto, lo añadimos al mapa.
          // Creamos una copia del objeto para no modificar los datos originales (inmutabilidad).
          aggregatedProductsMap.set(product.id, { ...product });
        }
      }
    }

    // 5. Convertir los valores del mapa a un arreglo y devolver el resultado.
    return Array.from(aggregatedProductsMap.values());
  }

  /* -------------------------------------------------------------------------- */
  /* PRE-VERIFICACIÓN RÁPIDA DE STOCK                      */
  /* -------------------------------------------------------------------------- */
  async verifyStockAvailability(
    products: any[],
  ): Promise<{ success: boolean; message: string }> {
    try {
      for (const product of products) {
        const productRef = doc(this.productsCollection, product.id as string);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          return {
            success: false,
            message: `El producto ${product.name} no existe en la base de datos.`,
          };
        }

        const currentAvailability =
          productSnap.data()['availability_in_deposit'] ?? 0;

        if (currentAvailability - product.quantity < 0) {
          return {
            success: false,
            message: `Stock insuficiente para: ${product.name.toUpperCase()}. Disponible: ${currentAvailability}`,
          };
        }
      }
      return { success: true, message: 'Stock validado correctamente.' };
    } catch (error: any) {
      console.error('Error verificando stock:', error);
      return {
        success: false,
        message: 'Error de conexión al verificar el stock.',
      };
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                GUARDAR VENTA Y ACTUALIZAR STOCK DE PRODUCTOS               */
  /* -------------------------------------------------------------------------- */

  async saveSale(
    sale: SaleDto,
  ): Promise<{ success: boolean; message: string; id?: string }> {
    try {
      const saleWithTimestamps = {
        ...sale,
      };

      const saleRef = doc(this.salesCollection);

      await runTransaction(db, async (transaction) => {
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
              `Stock insuficiente para el producto: ${product.name.toLocaleUpperCase()}`,
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
          is_local_sale: true,
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
        message: error.message || 'Error al guardar la venta',
      };
    }
  }

  /* ---------------------------------------------------*/
  /*                FACTURACIÓN CON AFIP               */
  /* ------------------------------------------------- */
  async billWithAFIP(payload: {
    total: number;
    cliente: any;
    tipoFactura: string;
  }): Promise<any> {
    try {
      // 1. LEER EL FLAG DE ENTORNO DESDE FIRESTORE
      const configRef = doc(db, 'arca', 'arca_config');
      const configSnap = await getDoc(configRef);

      // Si no existe el documento, por seguridad asumimos que es Homologación (false)
      const isProduction = configSnap.exists()
        ? configSnap.data()['isProduction']
        : false;

      // 2. ADJUNTAR EL FLAG AL PAQUETE
      const finalPayload = {
        ...payload,
        isProduction: isProduction,
      };
      const response = await fetch('http://localhost:3001/api/facturar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error || result.detalle || 'Error al facturar en ARCO',
        );
      }

      return result;
    } catch (error) {
      console.error('Error en SaleService (ARCA):', error);
      throw error;
    }
  }

  // CONSULTAR FACTURAS
  async consultInvoiceWithAFIP(
    ptoVta: number,
    cbteTipo: number,
    nroCbte: number,
  ): Promise<any> {
    try {
      // 1. LEER EL FLAG DE ENTORNO DESDE FIRESTORE
      const configRef = doc(db, 'arca', 'arca_config');
      const configSnap = await getDoc(configRef);
      const isProduction = configSnap.exists()
        ? configSnap.data()['isProduction']
        : false;

      // 2. ENVIAR PETICIÓN GET AL BACKEND
      const response = await fetch(
        `http://localhost:3001/api/factura/consultar/${ptoVta}/${cbteTipo}/${nroCbte}?isProduction=${isProduction}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.detalle || result.error || 'Error al consultar comprobante',
        );
      }

      return result.data;
    } catch (error) {
      console.error('Error al consultar ARCA:', error);
      throw error;
    }
  }
}
