import { Injectable, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  QuerySnapshot,
  setDoc,
  startAfter,
  updateDoc,
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
  private productsCollection = collection(this.firestore, 'products'); // Referencia a la colección

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

  // Crear producto
  async createProduct(product: Product): Promise<void> {
    const productRef = doc(this.productsCollection);
    await setDoc(productRef, { ...product, id: productRef.id });
  }
  // Leer productos (paginados)
  async getProducts(pageSize: number, lastVisible?: any): Promise<Product[]> {
    let q = query(this.productsCollection, orderBy('name'), limit(pageSize));
    if (lastVisible) {
      q = query(
        this.productsCollection,
        orderBy('name'),
        startAfter(lastVisible),
        limit(pageSize)
      );
    }

    const querySnapshot = await getDocs(q);
    return this.mapSnapshotToProducts(querySnapshot);
  }
  // Actualizar un producto
  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    const productRef = doc(this.firestore, 'products', id); // Referencia al documento
    await updateDoc(productRef, product); // Actualiza los datos en Firestore
  }
  // Eliminar producto
  async deleteProduct(id: string): Promise<void> {
    const productRef = doc(this.productsCollection, id);
    await deleteDoc(productRef);
  }

  // Buscar productos por nombre
  async searchProductsByName(name: string): Promise<Product[]> {
    const q = query(
      this.productsCollection,
      where('name', '>=', name),
      where('name', '<=', name + '\uf8ff') // Búsqueda que soporte prefijos
    );
    const querySnapshot = await getDocs(q);
    return this.mapSnapshotToProducts(querySnapshot);
  }

  // Utilidad para mapear los documentos a objetos Product
  private mapSnapshotToProducts(
    snapshot: QuerySnapshot<DocumentData>
  ): Product[] {
    return snapshot.docs.map((doc) => ({
      ...(doc.data() as Product),
      id: doc.id,
    }));
  }
}
