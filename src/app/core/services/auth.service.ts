import { inject, Injectable } from '@angular/core';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { UserService } from '../user/user.service';
import { User } from '../user/model/user-model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor() {}
  private auth = getAuth();
  private userService = inject(UserService);

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    console.log('Usuairo logueado: ', this.auth.currentUser);
    localStorage.removeItem('token');
    return signOut(this.auth);
  }

  async currentUser(): Promise<User | null> {
    const cUser = this.auth.currentUser;
    console.log(cUser);
    if (!cUser) {
      return Promise.resolve(null);
    } else {
      return this.userService.getUser(cUser.uid);
    }
    // return this.auth.currentUser;
  }
}
