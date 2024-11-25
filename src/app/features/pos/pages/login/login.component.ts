import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private firestore: AuthService, private router: Router) {}

  async login() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const userCredential = await this.firestore.login(
        this.email,
        this.password
      );
      console.log('User logged in:', userCredential.user);
      localStorage.setItem('token', await userCredential.user.getIdToken());
      this.router.navigate(['/pos']);
    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage = error.message; // Muestra el mensaje de error
    } finally {
      this.isLoading = false;
    }
  }
}
