import { Injectable, signal } from '@angular/core';
import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
} from 'firebase/firestore';
import { Product } from '../../../core/models/product-model';
import { mapToProduct } from '../../../core/mapper/product-mapper';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor() {}
  private firestore = getFirestore(); // Obtiene la instancia Firestore
  private productsSignal = signal<Product[]>([]); // Signal para almacenar los productos

  async getProductByBarcode(barcode: string) {
    const productsRef = collection(this.firestore, 'products'); // Referencia a la colección
    const productsQuery = query(productsRef, where('barcode', '==', barcode)); // Consulta a Firestore

    await getDocs(productsQuery).then((querySnapshot) => {
      const products: Product[] = [];
      querySnapshot.docs.map((doc) => {
        products.push(mapToProduct(doc.id, doc.data()));
      });
      this.productsSignal.set(products); // Actualiza la signal con los resultados
    });
    return this.productsSignal; // Devuelve la signal
  }
}
