import {ProductType} from "./ProductType";
import {ProductStatus} from "./ProductStatus";
import {ProductItem} from "./ProductItem";

export class Product {
  name: string;
  description: string;
  internal_number: string;
  stock: number; // nombre de produits en stock
  productItems: ProductItem[]; // le détail des produits rééls en stock
  type: ProductType; // "sale" pour produit destiné à la vente, "rental" pour produit destiné à la location, "service" pour prestation de service
  sell_price: number;
  rent_price : number;
  apply_degressivity: string; // "true" pour les produits à la location, "false" pour les produits en vente ou prestation de service
  photo: string;
  comment: string;
  date: Date;
  //status: ProductStatus;
}
