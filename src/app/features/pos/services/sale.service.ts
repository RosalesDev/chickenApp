import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  DocumentReference,
  getFirestore,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { SaleDto } from '../../../core/dtos/SaleDto';

@Injectable({
  providedIn: 'root',
})
export class SaleService {
  constructor() {}

  private firestore = getFirestore();
  private salesCollection = collection(this.firestore, 'sales');
  private productsCollection = collection(this.firestore, 'products');

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
            throw new Error(`Producto con ID ${product.id} no existe`);
          }

          const currentAvailability =
            productSnap.data()['availability_in_deposit'] ?? 0;
          const newAvailability = currentAvailability - product.quantity;

          if (newAvailability < 0) {
            throw new Error(
              `Stock insuficiente para el producto con ID ${product.id}`
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
      // Guardar la venta
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
        message: 'Ocurrió un error al guardar la venta. Intente nuevamente.',
      };
    }
  }
}
