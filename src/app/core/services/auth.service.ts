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
    localStorage.removeItem('token');
    return signOut(this.auth);
  }

  currentUser(): Promise<User | null> {
    return this.userService.getUser(this.auth.currentUser!.uid);
    // return this.auth.currentUser;
  }
}
