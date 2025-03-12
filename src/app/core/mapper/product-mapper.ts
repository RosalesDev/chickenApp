import { ProductDTO } from '../dtos/ProductDto';
import { Product } from '../models/product-model';

export function mapToProduct(id: string, data: any): Product {
  return {
    id: id,
    barcode: data.barcode || '',
    pluCode: data.plu_code || '',
    availabilityInDeposit: data.availability_in_deposit || 0,
    initials: data.initials || '',
    isWeighed: data.is_weighed || false,
    name: data.name || '',
    priceByKg: data.price_by_kg,
    priceByUnit: data.price_by_unit,
    quantity: 0,
  };
}

export function mapToProductDto(product: Product): ProductDTO {
  return {
    barcode: product.barcode || '',
    plu_code: product.pluCode || '',
    availability_in_deposit: Number(product.availabilityInDeposit),
    initials: product.initials,
    is_weighed: product.isWeighed,
    name: product.name,
    price_by_kg: Number(product.priceByKg) || 0,
    price_by_unit: Number(product.priceByUnit) || 0,
  };
}
