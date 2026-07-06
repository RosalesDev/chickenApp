import { Injectable } from '@angular/core';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { Customer } from '../../../core/models/customer-model';
import { db } from '../../../config/firebase.config';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private collectionName = 'customers';

  // Nuestra caché en memoria
  private cachedCustomers: Customer[] | null = null;

  constructor() {}

  // Agrega esto en tu CustomerService
  async getAfipData(cuit: string): Promise<any> {
    try {
      //const configRef = doc(db, 'config', 'arca_config');
      //const configSnap = await getDoc(configRef);
      const isProduction = true;
      // Ajusta el puerto y la URL según tu backend de Node
      const response = await fetch(
        `http://localhost:3001/api/afip/padron/${cuit}?isProduction=${isProduction}`,
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error || result.message || 'Error al buscar en AFIP',
        );
      }

      return result.data;
    } catch (error) {
      console.error('Error en CustomerService (AFIP):', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los clientes de Firebase o de la caché local.
   */
  async getAllCustomers(forceRefresh = false): Promise<Customer[]> {
    if (this.cachedCustomers && !forceRefresh) {
      return this.cachedCustomers; // Devuelve la caché instantáneamente
    }

    try {
      console.log('Descargando clientes desde Firestore...');
      const querySnapshot = await getDocs(collection(db, this.collectionName));

      this.cachedCustomers = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Customer[];

      return this.cachedCustomers;
    } catch (error) {
      console.error('Error obteniendo clientes:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo cliente en Firestore y lo agrega a la caché local.
   */
  async createCustomer(customerData: Omit<Customer, 'id'>): Promise<Customer> {
    try {
      const docRef = await addDoc(
        collection(db, this.collectionName),
        customerData,
      );

      const newCustomer: Customer = {
        id: docRef.id,
        ...customerData,
      };

      // Actualizamos la caché local para que futuras búsquedas lo encuentren al instante
      if (this.cachedCustomers) {
        this.cachedCustomers.push(newCustomer);
      }

      return newCustomer;
    } catch (error) {
      console.error('Error creando el cliente:', error);
      throw error;
    }
  }
}
