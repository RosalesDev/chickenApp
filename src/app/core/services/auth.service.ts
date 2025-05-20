import { inject, Injectable } from '@angular/core';
import {
  browserLocalPersistence,
  //Auth,
  getAuth,
  getIdToken,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { UserService } from '../user/user.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = getAuth();
  private userService = inject(UserService);
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  private firestore = getFirestore();

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        try {
          const token = await getIdToken(user, true); // Forzamos renovación del ID token
        } catch (error) {
          console.error('Error al renovar token:', error);
        }
      }
      this.userSubject.next(user);
    });

    // setPersistence(this.auth, browserLocalPersistence).catch((error) => {
    //   console.error('Error configurando la persistencia:', error);
    // });
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  async getUserDataFromDB() {
    const currentUserId = this.getCurrentUser()?.uid;
    console.log('currentUser: ', currentUserId);
    if (!currentUserId) {
      console.log('No hay usuario logueado');
      return null;
    }
    const user = await this.userService.getUser(currentUserId);
    if (!user) {
      console.log('No existe el usuario en la base de datos');
      return null;
    }
    const userDoc = await getDoc(doc(this.firestore, 'users', user?.uid));
    console.log('userDoc: ', userDoc.data);
    if (!userDoc.exists()) {
      console.log('No existe el documento del usuario en la base de datos');
      return null;
    }
    return userDoc.exists() ? userDoc.data() : null;
  }

  async getFreshToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (user) {
      try {
        return await getIdToken(user, true); // fuerza renovación
      } catch {
        return null;
      }
    }
    return null;
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    console.log('Usuairo logueado: ', this.auth.currentUser?.email);
    localStorage.removeItem('token');
    return signOut(this.auth);
  }

  getUser(): Observable<User | null> {
    return this.user$;
  }

  isLoggedIn(): boolean {
    return this.userSubject.value !== null;
  }

  // async currentUser(): Promise<User | null> {
  //   const cUser = this.auth.currentUser;
  //   console.log(cUser);
  //   if (!cUser) {
  //     return Promise.resolve(null);
  //   } else {
  //     return this.userService.getUser(cUser.uid);
  //   }
  //   // return this.auth.currentUser;
  // }
}
