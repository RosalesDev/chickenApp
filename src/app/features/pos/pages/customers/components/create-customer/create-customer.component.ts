import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../../../services/customer.service'; // Ajusta tu ruta real
import Swal from 'sweetalert2';

@Component({
  selector: 'app-create-customer',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-customer.component.html',
  styleUrl: './create-customer.component.css', // Si lo usas
})
export class CreateCustomerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private customerService = inject(CustomerService);

  form: FormGroup;
  isLoading = false;

  constructor() {
    this.form = this.fb.group({
      cuit: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      name: ['', [Validators.required]],
      address: [''],
      iva_cond: ['Consumidor final', [Validators.required]], // Por defecto
      balance: [0], // Saldo inicial
      status: ['ACT'], // Estado activo
    });
  }

  ngOnInit(): void {
    // Escuchamos los parámetros de la URL enviados desde el POS
    this.route.queryParams.subscribe((params) => {
      if (params['cuit']) {
        this.form.patchValue({
          cuit: params['cuit'],
          iva_cond: 'Responsable Inscripto', // Si viene un CUIT, asumimos RI para ahorrarle clics al cajero
        });
      }
      if (params['name']) {
        this.form.patchValue({
          name: params['name'],
        });
      }
    });
  }

  async createCustomer(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    Swal.fire({
      title: 'Guardando cliente...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      await this.customerService.createCustomer(this.form.value);

      Swal.fire({
        icon: 'success',
        title: '¡Cliente guardado!',
        text: 'Redirigiendo a la venta...',
        timer: 1500,
        showConfirmButton: false,
      });

      // Lo devolvemos al POS para que continúe cobrando
      this.router.navigate(['/home/pos']);
    } catch (error) {
      console.error('Error al guardar el cliente:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al intentar guardar el cliente en la base de datos.',
      });
    } finally {
      this.isLoading = false;
    }
  }
}
