import DateTimeFormat = Intl.DateTimeFormat;
import {Contact} from './contact';
export class Client {
  name: string;
  address: string;
  zipcode: number;
  town: string;
  country: string;
  phone: string;
  //email: string;
  contacts: Contact[];
  comment: string;
  rentalDiscount: number;
  saleDiscount: number;
  discount: number;// pour la compatibilité avec les devis antérieurs à juillet 2019
  maintenance:boolean;
  date: Date;
}
