import { inject, Injectable } from '@angular/core';
import {
  //Auth,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { UserService } from '../user/user.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = getAuth();
  private userService = inject(UserService);
  private user$ = new BehaviorSubject<User | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => this.user$.next(user));
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    console.log('Usuairo logueado: ', this.auth.currentUser);
    localStorage.removeItem('token');
    return signOut(this.auth);
  }

  getUser(): Observable<User | null> {
    return this.user$.asObservable();
  }

  isLoggedIn(): boolean {
    return this.user$.value !== null;
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
