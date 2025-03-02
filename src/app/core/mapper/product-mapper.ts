import { Product } from '../models/product-model';

export function mapToProduct(id: string, data: any): Product {
  return {
    id: id,
    barcode: data.barcode || '',
    pluCode: data.pluCode || '',
    availability_in_deposit: data.availability_in_deposit || 0,
    initials: data.initials || '',
    is_weighed: data.is_weighed || false,
    name: data.name || '',
    price_by_kg: data.price_by_kg,
    price_by_unit: data.price_by_unit,
    quantity: 0,
  };
}
