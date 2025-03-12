import { Product } from '../models/product-model';

export interface ProductDTO {
  id?: string;
  barcode: string | null; // Código de barras del producto
  plu_code: string | null;
  availability_in_deposit: number; // Disponibilidad en el depósito (stock)
  initials: string; // Iniciales del producto o código corto
  is_weighed: boolean; // Indica si el producto es por peso
  name: string; // Nombre del producto
  price_by_kg?: number; // Precio por kilogramo (opcional, solo si es por peso)
  price_by_unit?: number; // Precio por unidad (opcional, solo si no es por peso)
}
