import {Product} from "../product/product";
import {Client} from "../client/client";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
import {Employe} from "../employe/employe";

export class ServiceContract {
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
  rentDateFrom: Timestamp;
  rentDateTo: Timestamp;
  immoDateFrom: Timestamp;
  immoDateTo: Timestamp;
  quotationComment: string;
  privateQuotationComment: string;
  quotationDate: Timestamp;
  fromQuotationId: string;
  forQuotationId: string;
  fromServiceContractId: string;
  forServiceContractId: string;
  clientOrderNumber: string;
  relaunchClientDate:Timestamp;
  installationAddress: string;
  installationZipcode: number;
  installationTown: string;
  installationDate: Timestamp;
  dismountingDate: Timestamp;
  installationHours: string;
  installationContactName: string;
  installationContactPhone: string;
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
  tickets : Array<{ticketElements: Array<{comment: String, date : Timestamp, author: String}>}>// introduce in februrary 2020
}
