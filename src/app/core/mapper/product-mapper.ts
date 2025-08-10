import { ProductDTO } from '../dtos/ProductDto';
import { Product } from '../models/product-model';

export function mapToProduct(id: string, data: any): Product {
  return {
    id: id,
    barcode: data.barcode || '',
    plu_code: data.plu_code || '',
    availability_in_deposit: data.availability_in_deposit || 0,
    initials: data.initials || '',
    is_weighed: data.is_weighed || false,
    name: data.name || '',
    price_by_kg: data.price_by_kg,
    price_by_unit: data.price_by_unit,
    quantity: 0,
  };
}

export function mapToProductDto(product: Product): ProductDTO {
  return {
    barcode: product.barcode || '',
    plu_code: product.plu_code || '',
    availability_in_deposit: Number(product.availability_in_deposit),
    initials: product.initials,
    is_weighed: product.is_weighed,
    name: product.name,
    price_by_kg: Number(product.price_by_kg) || 0,
    price_by_unit: Number(product.price_by_unit) || 0,
    is_local: product.is_local || false,
  };
}
