import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';
import { UserService } from '../../../../core/user/user.service';
import Swal from 'sweetalert2';

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

  // loggedUser = signal<User | null>(null);

  constructor(private authService: AuthService, private router: Router) {}

  async login() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const userCredential = await this.authService.login(
        this.email,
        this.password
      );
      console.log(
        'login.component >> usuario logueado:',
        this.authService.getUser()
      );

      const userData = await this.authService.getUserDataFromDB(
        userCredential.user.uid
      );

      if (!userData || userData['status'] !== 'ACTIVE') {
        console.log('User is not active');
        this.router.navigate(['auth/login']);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Usuario inhabilitado',
          confirmButtonText: 'OK',
        });
      }
      this.router.navigate(['/home']);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Usuario o contraseña incorrectos',
        confirmButtonText: 'OK',
      });
      console.error('Login error:', error);
      this.errorMessage = error.message; // Muestra el mensaje de error
    } finally {
      this.isLoading = false;
    }
  }
}
