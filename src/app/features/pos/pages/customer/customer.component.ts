import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../../../core/models/customer-model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './customer.component.html',
})
export class CustomersComponent implements OnInit {
  private customerService = inject(CustomerService);
  private fb = inject(FormBuilder);

  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  searchQuery = '';
  isLoading = false;

  // Variables del Modal
  isModalOpen = false;
  isEditing = false;
  currentCustomerId: string | null = null;
  customerForm: FormGroup;

  constructor() {
    this.customerForm = this.fb.group({
      cuit: ['', [Validators.pattern('^[0-9]*$')]], // Opcional, pero si está, que sean números
      name: ['', Validators.required],
      iva_cond: ['Consumidor final', Validators.required],
      address: [''],
      status: ['ACT', Validators.required],
      balance: [0], // Por defecto 0
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
  }

  async loadCustomers() {
    this.isLoading = true;
    try {
      this.customers = await this.customerService.getAllCustomers();
      this.filteredCustomers = [...this.customers];
    } catch (error) {
      Swal.fire('Error', 'No se pudieron cargar los clientes', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  searchCustomers() {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredCustomers = [...this.customers];
      return;
    }
    this.filteredCustomers = this.customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.cuit && c.cuit.includes(query)),
    );
  }

  // --- LÓGICA DEL MODAL ---

  openModal(customer?: Customer) {
    if (customer) {
      this.isEditing = true;
      this.currentCustomerId = customer.id!;
      this.customerForm.patchValue({
        cuit: customer.cuit,
        name: customer.name,
        iva_cond: customer.iva_cond,
        address: customer.address,
        status: customer.status,
        balance: customer.balance,
      });
    } else {
      this.isEditing = false;
      this.currentCustomerId = null;
      this.customerForm.reset({
        iva_cond: 'Consumidor final',
        status: 'ACT',
        balance: 0,
      });
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.customerForm.reset();
  }

  // --- MAGIA CON ARCA ---
  async searchAfip() {
    const cuit = this.customerForm.get('cuit')?.value;
    if (!cuit || cuit.length !== 11) {
      Swal.fire('Atención', 'Ingresá un CUIT válido de 11 números', 'warning');
      return;
    }

    Swal.fire({
      title: 'Consultando ARCA...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const afipData = await this.customerService.getAfipData(cuit);

      // Llenamos el formulario automáticamente
      this.customerForm.patchValue({
        name: afipData.name,
        address: afipData.address,
        iva_cond:
          afipData.iva_cond === 'RESPONSABLE_INSCRIPTO'
            ? 'Responsable Inscripto'
            : afipData.iva_cond === 'MONOTRIBUTO'
              ? 'Monotributo'
              : 'Consumidor final',
        status: afipData.status === 'ACT' ? 'ACT' : 'INA',
      });

      Swal.close();
    } catch (error: any) {
      Swal.fire('Error', error.message || 'No se encontró el CUIT', 'error');
    }
  }

  // --- GUARDAR Y ELIMINAR ---

  async saveCustomer() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    Swal.fire({
      title: 'Guardando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const formData = this.customerForm.value as Customer;

      if (this.isEditing && this.currentCustomerId) {
        await this.customerService.updateCustomer(
          this.currentCustomerId,
          formData,
        );
        Swal.fire(
          '¡Actualizado!',
          'El cliente se modificó correctamente',
          'success',
        );
      } else {
        await this.customerService.createCustomer(formData);
        Swal.fire(
          '¡Creado!',
          'El cliente se registró correctamente',
          'success',
        );
      }

      this.closeModal();
      this.loadCustomers(); // Recarga la lista local
    } catch (error) {
      Swal.fire('Error', 'Ocurrió un problema al guardar', 'error');
    }
  }

  async toggleCustomerStatus(customer: Customer) {
    const isActivating = customer.status === 'INA';
    const actionText = isActivating ? 'activar' : 'desactivar';

    const confirm = await Swal.fire({
      title: `¿${isActivating ? 'Activar' : 'Desactivar'} cliente?`,
      text: isActivating
        ? 'El cliente volverá a estar disponible para operar.'
        : 'Los datos no se borrarán, pero el cliente pasará a estado Inactivo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isActivating ? '#198754' : '#d33', // Verde para activar, Rojo para desactivar
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Sí, ${actionText}`,
      cancelButtonText: 'Cancelar',
    });

    if (confirm.isConfirmed) {
      Swal.fire({
        title: 'Procesando...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      try {
        const newStatus = isActivating ? 'ACT' : 'INA';

        // Usamos el updateCustomer que ya teníamos para hacer el "Soft Delete"
        await this.customerService.updateCustomer(customer.id!, {
          status: newStatus,
        });

        Swal.fire(
          '¡Éxito!',
          `El cliente ha sido ${actionText}do correctamente.`,
          'success',
        );
        this.loadCustomers(); // Recargamos la tabla
      } catch (error) {
        Swal.fire('Error', `No se pudo ${actionText} al cliente`, 'error');
      }
    }
  }
}
