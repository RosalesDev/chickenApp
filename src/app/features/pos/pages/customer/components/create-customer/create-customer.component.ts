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
  isSearchingAfip = false;

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

  // NUEVA FUNCIÓN: Busca en AFIP y autocompleta
  async searchInAfip(): Promise<void> {
    const cuitControl = this.form.get('cuit');

    if (!cuitControl?.value || cuitControl.value.length !== 11) {
      Swal.fire({
        icon: 'warning',
        title: 'CUIT Inválido',
        text: 'Por favor, ingresá los 11 números del CUIT antes de buscar.',
      });
      return;
    }

    this.isSearchingAfip = true;

    try {
      // Llamamos al servicio
      const afipData = await this.customerService.getAfipData(
        cuitControl.value,
      );

      // Autocompletamos el formulario mágicamente
      this.form.patchValue({
        name: afipData.name,
        address: afipData.address,
        iva_cond: afipData.iva_cond,
      });

      // Pequeño feedback visual
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      Toast.fire({
        icon: 'success',
        title: 'Datos obtenidos de AFIP',
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'info',
        title: 'No encontrado',
        text: 'No pudimos obtener los datos de AFIP. Podés ingresarlos manualmente.',
      });
    } finally {
      this.isSearchingAfip = false;
    }
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
