import {Product} from "../product/product";
import {Client} from "../client/client";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
import {Employe} from "../employe/employe";

export class Order {
  client: Client;
  contact: any;
  employe: Employe;
  singleProductAmount: number[];
  singleProduct: Product[];
  compositeProduct: Product[];
  compositeProductAmount: number;
  specialProductName : string;
  specialProductPrice : number;
  rentDateFrom: Timestamp;
  rentDateTo: Timestamp;
  immoDateFrom: Timestamp;
  immoDateTo: Timestamp;
  quotationComment: string;
  quotationDate: Timestamp;
  relaunchClientDate:Timestamp;
  installationAddress: string;
  installationZipcode: number;
  installationTown: string;
  installationDate: Timestamp;
  installationHours: string;
  installationContact: string;
  orderDate: Timestamp;
  scanOrder: string;
  balanceInvoiceDate:Timestamp;
  orderComment: string;
  deliveryComment: string;
  advanceRate:number;
  numerosInvoice: {advance: number, balance: number};
  credit:number;
}
