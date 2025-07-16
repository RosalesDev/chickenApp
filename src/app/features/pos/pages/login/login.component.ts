import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';
import { UserService } from '../../../../core/user/user.service';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('emailInput') emailInputRef!: ElementRef;

  email: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;
  private destroy$ = new Subject<void>(); // Un Subject para manejar la desuscripción

  // loggedUser = signal<User | null>(null);

  constructor(private authService: AuthService, private router: Router) {}
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.emailInputRef.nativeElement.focus();
    });
  }

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
      this.authService
        .hasAnyRole(['ADMIN'])
        .pipe(takeUntil(this.destroy$)) // Importante: desuscribirse cuando el componente se destruye
        .subscribe((isAdmin) => {
          if (isAdmin) {
            this.router.navigate(['/main-menu']);
          } else {
            this.router.navigate(['/home/pos']);
          }
        });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Usuario o contraseña incorrectos',
        confirmButtonText: 'OK',
      });
      console.error('Login error:', error);
      this.errorMessage = error.message; // Muestra el mensaje de error
      this.isLoading = false; // Asegúrate de desactivar el loading en caso de error
    }
  }
}
