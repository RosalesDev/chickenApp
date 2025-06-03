import { inject, Injectable } from '@angular/core';
import {
  getAuth,
  getIdToken,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { User as UserProfile } from '../models/user-model';
import { UserService } from '../user/user.service';
import { BehaviorSubject, Observable, of, ReplaySubject } from 'rxjs';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = getAuth();
  private firestore = getFirestore();
  private userService = inject(UserService);
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  private readySubject = new ReplaySubject<boolean>(1);
  userProfile$: Observable<UserProfile | null> = of(null);

  ready$ = this.readySubject.asObservable();

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      console.log('Se ejecuta el onAuthStateChanged');
      if (user) {
        console.log('Entra al if del onAuthStateChanged', user);
        try {
          this.userProfile$ = this.userService.getUserProfile(user.uid);
          const token = await getIdToken(user, true); // Forzamos renovación del ID token
        } catch (error) {
          console.error('Error al renovar token:', error);
        }
        this.readySubject.next(true);
      } else {
        console.log('Entra al else del onAuthStateChanged');
        this.userProfile$ = of(null);
        this.readySubject.next(false);
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

  async getUserDataFromDB(uid: string) {
    if (!uid) {
      console.log('No hay usuario logueado');
      return null;
    }
    const user = await this.userService.getUser(uid);
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
        console.log('Renovando token...');
        const token = await getIdToken(user, true); // fuerza renovación
        return token;
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
