import { Injectable } from '@angular/core';
import {
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { mapToUser } from '../mapper/user-mapper';
import { User } from './model/user-model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private db = getFirestore(); // Inicializa Firestore

  async getUser(uid: string): Promise<User | null> {
    const userDoc = doc(this.db, 'users', uid);
    const userSnapshot = await getDoc(userDoc);
    if (userSnapshot.exists()) {
      console.log(userSnapshot.data());
      return mapToUser(uid, userSnapshot.data());
      // return userSnapshot.data() as User;
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
