import { Injectable } from '@angular/core';
import {
  deleteDoc,
  doc,
  getFirestore,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
  DocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { mapToUser } from '../mapper/user-mapper';
import { User } from '../models/user-model';
import { BehaviorSubject, from, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private db = getFirestore(); // Inicializa Firestore
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  async getUser(uid: string): Promise<User | null> {
    try {
      const users_ref = collection(this.db, 'users');
      const q = query(users_ref, where('external_id', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]; // Tomar el primer documento
        console.log(mapToUser(doc.id, doc.data()));
        this.userSubject.next(mapToUser(doc.id, doc.data()));
        return this.userSubject.value;
      } else {
        console.log('No document found with the given attribute and value');
        return null;
      }
    } catch (error: any) {
      console.error('Error getting document:', error);
    }

    return null;
  }
  /**
   * Obtiene un usuario de la colección 'users' donde el campo 'external_id'
   * coincide con el UID proporcionado.
   * @param uid El UID a buscar en el campo 'external_id'.
   * @returns Un Observable que emite el UserProfile o null si no se encuentra.
   */
  getUserProfileByExternalId(uid: string): Observable<User | null> {
    if (!uid) {
      return new Observable((subscriber) => {
        subscriber.next(null);
        subscriber.complete();
      });
    }
    const usersCollectionRef = collection(this.db, 'users');

    // Construimos la consulta:
    // 1. Apunta a la colección 'users'.
    // 2. Aplica un filtro 'where' donde el campo 'external_id' sea igual al 'uid' dado.
    const q = query(usersCollectionRef, where('external_id', '==', uid));

    // Ejecutamos la consulta y manejamos los resultados
    return from(getDocs(q)).pipe(
      map((querySnapshot) => {
        if (!querySnapshot.empty) {
          // Si hay resultados, tomamos el primer documento
          const docData = querySnapshot.docs[0].data() as User;
          // Opcional: puedes añadir el ID del documento si lo necesitas
          // docData.id = querySnapshot.docs[0].id;
          return docData;
        } else {
          console.log(`No se encontró ningún usuario con external_id: ${uid}`);
          return null; // No se encontró ningún documento
        }
      })
    );
  }

  /**
   * Obtiene el perfil de usuario de Firestore por UID en tiempo real usando onSnapshot.
   * Emite cada vez que el documento cambia en Firestore.
   * @param uid El UID del usuario.
   * @returns Un Observable del perfil de usuario o null si no existe.
   */
  getUserProfile(uid: string): Observable<User | null> {
    if (!uid) {
      return new Observable((subscriber) => {
        subscriber.next(null);
        subscriber.complete();
      });
    }

    const userDocRef = doc(this.db, `users/${uid}`);
    console.log('userDocRef:', userDocRef);

    // onSnapshot devuelve una función para desuscribirse
    return new Observable<User | null>((subscriber) => {
      const unsubscribe = onSnapshot(
        userDocRef,
        (snapshot: DocumentSnapshot<DocumentData>) => {
          if (snapshot.exists()) {
            subscriber.next({
              uid: snapshot.id,
              ...(snapshot.data() as Omit<User, 'uid'>),
            });
          } else {
            subscriber.next(null);
          }
        },
        (error) => {
          subscriber.error(error);
        }
      );

      // La función de retorno de un Observable es lo que se ejecuta cuando el Observable se desuscribe
      return () => unsubscribe();
    });
  }

  async createUser(uid: string, user: User): Promise<void> {
    const userDoc = doc(this.db, 'users', uid);
    await setDoc(userDoc, user);
  }

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    const userDoc = doc(this.db, 'users', uid);
    await updateDoc(userDoc, data);
  }

  async deleteUser(uid: string): Promise<void> {
    const userDoc = doc(this.db, 'users', uid);
    await deleteDoc(userDoc);
  }
}
