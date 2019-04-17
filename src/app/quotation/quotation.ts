import {Product} from "../product/product";
import {Client} from "../client/client";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
import {Employe} from "../employe/employe";

export class Quotation {
  client: Client;
  contact: any;
  employe: Employe;
  singleProductAmount: number[];
  singleProduct: Product[];
  compositeProduct: Product[];
  compositeProductAmount: number;
  specialProduct :  string[];
  specialProductPrice : number[];
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
}
