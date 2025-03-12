import { Injectable, signal } from '@angular/core';
import {
  addDoc,
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
import {
  mapToProduct,
  mapToProductDto,
} from '../../../core/mapper/product-mapper';
import { FormGroup } from '@angular/forms';

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
  async saveProduct(product: Product): Promise<void> {
    const productDto = mapToProductDto(product);
    const productRef = doc(this.productsCollection);
    const collectionName = 'products';
    try {
      if (product.id) {
        // Si el producto tiene ID, lo actualiza en Firestore
        const productRef = doc(this.firestore, collectionName, product.id);
        await setDoc(productRef, productDto, { merge: true });
      } else {
        // Si no tiene ID, lo agrega a Firestore y Firebase genera uno automáticamente
        const docRef = await addDoc(
          collection(this.firestore, collectionName),
          productDto
        );
        await setDoc(
          doc(this.firestore, collectionName, docRef.id),
          { ...productDto },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      throw error;
    }
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
  async getProductsByName(name: string): Promise<Product[]> {
    const q = query(
      this.productsCollection,
      where('name', '>=', name),
      where('name', '<=', name + '\uf8ff') // Búsqueda que soporte prefijos
    );
    const querySnapshot = await getDocs(q);
    return this.mapSnapshotToProducts(querySnapshot);
  }
  // Buscar productos por PLU
  async getProductsByPluCode(pluCode: number): Promise<Product[]> {
    const q = query(this.productsCollection, where('pluCode', '==', pluCode));
    const querySnapshot = await getDocs(q);
    return this.mapSnapshotToProducts(querySnapshot);
  }

  // Utilidad para mapear los documentos a objetos Product
  private mapSnapshotToProducts(
    snapshot: QuerySnapshot<DocumentData>
  ): Product[] {
    const products: Product[] = [];
    snapshot.docs.map((doc) => {
      products.push(mapToProduct(doc.id, doc.data()));
    });
    return products;
  }
  mapProductFormToProduct(form: FormGroup): Product {
    return {
      id: null,
      name: form.get('name')?.value,
      pluCode: form.get('pluCode')?.value,
      barcode: form.get('barcode')?.value,
      initials: form.get('initials')?.value,
      availabilityInDeposit: form.get('availability_in_deposit')?.value,
      priceByUnit: form.get('price_by_unit')?.value,
      priceByKg: form.get('price_by_kg')?.value,
      isWeighed: form.get('is_weighed')?.value,
      quantity: 0,
    };
  }
}
