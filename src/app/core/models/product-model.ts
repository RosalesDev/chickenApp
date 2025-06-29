export interface Product {
  id: string | null;
  barcode: string; // Código de barras del producto
  pluCode: string;
  availabilityInDeposit: number; // Disponibilidad en el depósito (stock)
  initials: string; // Iniciales del producto o código corto
  isWeighed: boolean; // Indica si el producto es por peso
  name: string; // Nombre del producto
  priceByKg?: number; // Precio por kilogramo (opcional, solo si es por peso)
  priceByUnit?: number; // Precio por unidad (opcional, solo si no es por peso)
  quantity: number;
  amount_to_pay?: number;
  priceType?: string; // Tipo de precio (por unidad o por peso)
  is_local?: boolean; // Indica si el producto es local (no visible en la app)
}
