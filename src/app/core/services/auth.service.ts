import { inject, Injectable } from '@angular/core';
import {
  getAuth,
  getIdToken,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { User as UserProfile } from '../models/user-model';
import { UserService } from '../user/user.service';
import {
  BehaviorSubject,
  distinctUntilChanged,
  firstValueFrom,
  map,
  Observable,
  of,
  ReplaySubject,
  Subscription,
  switchMap,
} from 'rxjs';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = getAuth();
  private firestore = getFirestore();
  private userService = inject(UserService);
  private userSubject = new BehaviorSubject<User | null>(null);
  private readySubject = new ReplaySubject<boolean>(1);
  user$ = this.userSubject.asObservable();
  userProfile$: Observable<UserProfile | null> = of(null);
  userRoles$: Observable<string[]> = of([]);
  private userProfileSubscription: Subscription | null = null;

  ready$ = this.readySubject.asObservable();

  constructor() {
    this.userProfile$ = this.user$.pipe(
      switchMap((user) => {
        if (user) {
          return this.userService.getUserProfileByExternalId(user.uid);
        }
        return of(null);
      }),
      // Aseguramos que solo emitamos cuando el perfil cambie
      distinctUntilChanged(
        (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
      )
    );

    // Mapeamos el userProfile$ a userRoles$
    this.userRoles$ = this.userProfile$.pipe(
      map((userProfile) => userProfile?.roles || []),
      distinctUntilChanged(
        (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
      ) // Para evitar re-emisiones innecesarias
    );

    // Escuchamos los cambios de autenticación
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        // 1. Tenemos usuario de Firebase, pero NO estamos listos todavía.
        // Primero, actualizamos el userSubject para que userProfile$ se dispare.
        this.userSubject.next(user);

        try {
          // 2. Esperamos a que la carga del perfil desde Firestore TERMINE.
          // `firstValueFrom` convierte el observable en una promesa y espera su primer valor.
          await firstValueFrom(this.userProfile$);
          console.log(
            'AuthService: Perfil de usuario cargado desde Firestore.'
          );

          // 3. AHORA SÍ. Todo está cargado. Emitimos la señal "ready".
          this.readySubject.next(true);
          console.log('AuthService: Estado listo (ready).');
        } catch (error) {
          console.error(
            'Error al cargar el perfil de usuario desde Firestore:',
            error
          );
          // Si falla la carga del perfil, lo mejor es desloguear al usuario.
          await this.logout();
          this.readySubject.next(true); // Estamos "listos", pero en estado "no logueado".
        }
      } else {
        // Si no hay usuario, el estado es claro y definitivo.
        this.userSubject.next(null);
        this.readySubject.next(true); // Estamos "listos" y en estado "no logueado".
        console.log('AuthService: No hay usuario. Estado listo (ready).');
      }
    });
  }

  /**
   * Verifica si el usuario actual tiene alguno de los roles especificados.
   * @param requiredRoles Array de roles requeridos.
   * @returns Observable<boolean> que emite true si el usuario tiene al menos uno de los roles, false en caso contrario.
   */
  hasAnyRole(requiredRoles: string[]): Observable<boolean> {
    return this.userRoles$.pipe(
      map((userRoles) => {
        if (!userRoles || userRoles.length === 0) {
          return false; // El usuario no tiene roles asignados
        }
        // Verifica si hay al menos un rol común entre los roles del usuario y los roles requeridos
        return requiredRoles.some((role) => userRoles.includes(role));
      }),
      distinctUntilChanged() // Para evitar re-emisiones si el resultado no cambia
    );
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

  setPersistence() {
    return setPersistence(this.auth, browserSessionPersistence)
      .then(() => console.log('Persistencia configurada a sessionStorage'))
      .catch((error) => {
        console.error('Error al configurar la persistencia:', error);
      });
  }

  login(email: string, password: string) {
    this.setPersistence();
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

  onDestroy() {
    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
      this.userProfileSubscription = null;
    }
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
