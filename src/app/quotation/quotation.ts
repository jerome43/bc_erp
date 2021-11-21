import {Product} from "../product/product";
import {Client} from "../client/client";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
import {Employe} from "../employe/employe";

export class Quotation {
  client: Client;
  contact: any;
  referenceClient : string; // optionnel, référence devis ou commande fournie par le client
  employe: Employe;
  singleProductAmount: number[];
  singleProduct: Product[];
  compositeProducts: {compositeProductElements:Product[]}[];
  compositeProduct: Product[]; // only for compatibility devis antérieur à juillet 2019
  compositeProductAmount: number[];
  specialProduct :  string[];
  specialProductPrice : number[];
  optionalProductAmount: number[];
  optionalProduct: Product[];
  optionalLongRentalMonth : number;
  optionalLongRentalPrice : number;
  rentDateFrom: Timestamp;
  rentDateTo: Timestamp;
  immoDateFrom: Timestamp;
  immoDateTo: Timestamp;
  quotationComment: string;
  privateQuotationComment: string;
  quotationDate: Timestamp;
  relaunchClientDate:Timestamp;
  installationAddress: string;
  installationZipcode: number;
  installationTown: string;
  installationDate: Timestamp;
  installationHours: string;
  installationContactName: string;
  installationContactPhone: string;
  dismountingDate: Timestamp;
}
