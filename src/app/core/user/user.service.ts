import { Injectable } from '@angular/core';
import {
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
  collection,
  CollectionReference,
  DocumentData,
  query,
  where,
  limit,
  getDocs,
} from 'firebase/firestore';
import { mapToUser } from '../mapper/user-mapper';
import { User } from '../models/user-model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private db = getFirestore(); // Inicializa Firestore

  async getUser(uid: string): Promise<User | null> {
    try {
      const users_ref = collection(this.db, 'users');
      const q = query(users_ref, where('external_id', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]; // Tomar el primer documento
        console.log(mapToUser(doc.id, doc.data()));
        return mapToUser(doc.id, doc.data());
      } else {
        console.log('No document found with the given attribute and value');
        return null;
      }
    } catch (error: any) {
      console.error('Error getting document:', error);
    }

    return null;
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
