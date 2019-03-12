import DateTimeFormat = Intl.DateTimeFormat;
export class Product {
  name: string;
  description: string;
  //serial_number: string;
  internal_number: string;
 // barcode: string;
  stock: number; // nombre de produits en stock
  //sellable: string; // "true" pour produit destiné à la vente, "false" pour produit destiné à la location ou prestation de service
  type: string; // "sale" pour produit destiné à la vente, "rental" pour produit destiné à la location, "service" pour prestation de service
  sell_price: number;
  rent_price : number;
  apply_degressivity: string; // "true" pour les produits à la location, "false" pour les produits en vente ou prestation de service
  photo: string;
  comment: string;
  date: Date;
}
