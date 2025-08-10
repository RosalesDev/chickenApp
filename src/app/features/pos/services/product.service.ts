import { Injectable, signal } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  QuerySnapshot,
  serverTimestamp,
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
import Fuse from 'fuse.js';
import { ErrorModel } from '../../../core/models/error-model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor() {}
  private firestore = getFirestore(); // Obtiene la instancia Firestore
  private productsSignal = signal<Product[]>([]); // Signal para almacenar los productos
  private productsCollection = collection(this.firestore, 'products'); // Referencia a la colección
  allProducts = signal<Product[]>([]); // Lista de todos los productos
  fuse: Fuse<Product> | undefined;

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
  /* ----------------------- OBTENER TODOS LOS PRODUCTOS ---------------------- */
  async getProducts(): Promise<Product[] | ErrorModel> {
    let productList: Product[] = [];
    let q = query(this.productsCollection, orderBy('name'));
    // const querySnapshot = await getDocs(q);
    return getDocs(q)
      .then((querySnapshot) => {
        productList = this.mapSnapshotToProducts(querySnapshot);
        this.allProducts.set(productList); // Actualiza la signal con los productos
        this.fuse = new Fuse(productList, {
          keys: ['name'],
          threshold: 0.3, // Ajusta la tolerancia a errores
          includeScore: true,
        });
        return productList;
      })
      .catch((error) => {
        console.error('Error al obtener los productos:', error);
        return { success: false, error: error.message };
      });
  }

  searchProducts(query: string): Product[] {
    console.log(this.fuse?.search(query).map((result) => result.item));
    return this.fuse?.search(query).map((result) => result.item) || [];
  }
  // Actualizar un producto
  // async updateProduct(id: string, product: Partial<Product>): Promise<void> {
  //   const productRef = doc(this.firestore, 'products', id); // Referencia al documento
  //   await updateDoc(productRef, product); // Actualiza los datos en Firestore
  // }
  /**
   * Actualiza un producto existente en Firestore.
   *
   * @param {string} id - El ID del documento del producto a actualizar.
   * @param {Partial<Product>} productData - Un objeto con los campos del producto a actualizar.
   * @returns {Promise<void>} Una promesa que se resuelve cuando la actualización es exitosa.
   * @throws {Error} Lanza un error si el ID está vacío, no hay datos para actualizar o si falla la operación en Firestore.
   */
  async updateProduct(
    id: string,
    productData: Partial<Product>
  ): Promise<void> {
    // 1. Validación de entradas
    if (!id) {
      throw new Error('El ID del producto no puede estar vacío.');
    }
    if (!productData || Object.keys(productData).length === 0) {
      console.warn(
        'Se intentó actualizar un producto sin proporcionar datos. Operación cancelada.',
        { id }
      );
      return; // Opcional: puedes lanzar un error si prefieres que esto no sea silencioso.
    }

    const productRef = doc(this.firestore, 'products', id);

    // 2. Añadir metadatos (timestamp)
    const dataToUpdate = {
      ...productData,
      updatedAt: serverTimestamp(), // ¡Buena práctica!
    };

    // 3. Manejo de errores con try/catch
    try {
      await updateDoc(productRef, dataToUpdate);
      console.log(`Producto con ID: ${id} actualizado exitosamente.`);
    } catch (error) {
      console.error(`Error al actualizar el producto con ID: ${id}`, error);
      // 4. Re-lanzar un error más específico para la capa superior
      throw new Error('No se pudo actualizar el producto en la base de datos.');
    }
  }
  // Eliminar producto
  async deleteProductById(id: string): Promise<void> {
    const productRef = doc(this.productsCollection, id);
    return getDoc(productRef).then((docSnap) => {
      if (!docSnap.exists()) {
        return Promise.reject(
          new Error(`El producto con ID "${id}" no existe.`)
        );
      }
      return deleteDoc(productRef);
    });
    // try {
    //   const productRef = doc(this.productsCollection, id);
    //   const docSnap = await getDoc(productRef);
    //   if (!docSnap.exists()) {
    //     throw new Error(`El documento con ID "${id}" no existe.`);
    //   }
    //   await deleteDoc(productRef);
    //   console.log('Documento borrado');
    // } catch (error) {
    //   console.error('Error al borrar el documento:', error);
    // }
  }

  /**
   *
   * @param name - Nombre del producto a buscar.
   * @description Busca productos por nombre en Firestore. Utiliza un rango de búsqueda para permitir coincidencias parciales.
   * @returns
   */
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
  async getProductsByPluCode(pluCode: string): Promise<Product[]> {
    const q = query(this.productsCollection, where('plu_code', '==', pluCode));
    const querySnapshot = await getDocs(q);
    console.log(querySnapshot);
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
      plu_code: form.get('pluCode')?.value,
      barcode: form.get('barcode')?.value,
      initials: form.get('initials')?.value,
      availability_in_deposit: form.get('availability_in_deposit')?.value,
      price_by_unit: form.get('price_by_unit')?.value,
      price_by_kg: form.get('price_by_kg')?.value,
      is_weighed: form.get('is_weighed')?.value,
      quantity: 0,
      is_local: !form.get('is_visible_in_app')?.value,
    };
  }
}
