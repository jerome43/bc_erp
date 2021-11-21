import {Product} from "../product/product";
import {Client} from "../client/client";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
import {Employe} from "../employe/employe";

export class Order {
  client: Client;
  contact: any;
  referenceClient : string; // optionnel, référence devis ou commande fournie par le client
  employe: Employe;
  singleProductAmount: number[];
  singleProduct: Product[];
  compositeProducts: {compositeProductElements:Product[]}[];
  compositeProduct: Product[];  // only for compatibility devis antérieur à juillet 2019
  compositeProductAmount: number[];
  specialProduct: string[];
  specialProductPrice: number[];
  //optionalProductAmount: number[];
  //optionalProduct: Product[];
  rentDateFrom: Timestamp;
  rentDateTo: Timestamp;
  immoDateFrom: Timestamp;
  immoDateTo: Timestamp;
  quotationComment: string;
  quotationDate: Timestamp;
  quotationId: String;
  clientOrderNumber: String;
  relaunchClientDate:Timestamp;
  installationAddress: string;
  installationZipcode: number;
  installationTown: string;
  installationDate: Timestamp;
  installationHours: string;
  installationContactName: string;
  installationContactPhone: string;
  dismountingDate: Timestamp;
  orderDate: Timestamp;
  scanOrder: string;
  advanceInvoiceDate:Timestamp; // introduce in mars 2020
  balanceInvoiceDate:Timestamp;
  orderComment: string;
  deliveryComment: string;
  advanceRate:number;
  numerosInvoice: {advance: number, balance: number};
  paymentInvoice : {advance: {amount: number, date: Timestamp}, balance: { amount: number, date: Timestamp}}; // introduce in january 2020
  credit:number; // avance donnée par le client sur devis
  externalCosts : Array<{ name : string, amount : number }>; // introduce in january 2020
}
