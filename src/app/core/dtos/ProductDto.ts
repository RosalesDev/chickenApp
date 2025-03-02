import { Product } from '../models/product-model';

export class ProductDto {
  barcode: string | null; // Código de barras del producto
  pluCode: number | null;
  availability_in_deposit: number; // Disponibilidad en el depósito (stock)
  initials: string; // Iniciales del producto o código corto
  is_weighed: boolean; // Indica si el producto es por peso
  name: string; // Nombre del producto
  price_by_kg?: number; // Precio por kilogramo (opcional, solo si es por peso)
  price_by_unit?: number; // Precio por unidad (opcional, solo si no es por peso)
  quantity: number;

  constructor() {
    this.barcode = '';
    this.pluCode = 0;
    this.availability_in_deposit = 0;
    this.initials = '';
    this.is_weighed = false;
    this.name = '';
    this.price_by_kg = 0;
    this.price_by_unit = 0;
    this.quantity = 0;
  }

  // Método para mapear un objeto de tipo ProductDto a un objeto de tipo Product
  toProduct(id: string): Product {
    return {
      id: id,
      barcode: this.barcode ?? '',
      pluCode: this.pluCode ?? 0,
      availability_in_deposit: this.availability_in_deposit,
      initials: this.initials,
      is_weighed: this.is_weighed,
      name: this.name,
      price_by_kg: this.price_by_kg,
      price_by_unit: this.price_by_unit,
      quantity: this.quantity,
    };
  }
  //Metodo para mapear un objeto de tipo Product a un objeto de tipo ProductDto
  fromProduct(product: Product): ProductDto {
    this.barcode = product.barcode;
    this.pluCode = product.pluCode;
    this.availability_in_deposit = product.availability_in_deposit;
    this.initials = product.initials;
    this.is_weighed = product.is_weighed;
    this.name = product.name;
    this.price_by_kg = product.price_by_kg;
    this.price_by_unit = product.price_by_unit;
    this.quantity = product.quantity;
    return this;
  }
}
