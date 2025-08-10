export interface Product {
  id: string | null;
  barcode: string; // Código de barras del producto
  plu_code: string;
  availability_in_deposit: number; // Disponibilidad en el depósito (stock)
  initials: string; // Iniciales del producto o código corto
  is_weighed: boolean; // Indica si el producto es por peso
  name: string; // Nombre del producto
  price_by_kg?: number; // Precio por kilogramo (opcional, solo si es por peso)
  price_by_unit?: number; // Precio por unidad (opcional, solo si no es por peso)
  quantity: number;
  amount_to_pay?: number;
  subtotal?: number; // Subtotal del producto
  priceType?: string; // Tipo de precio (por unidad o por peso)
  is_local?: boolean; // Indica si el producto es local (no visible en la app)
}
