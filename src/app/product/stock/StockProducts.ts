import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;

export class StockProducts {
  productId: string;
  productName: string;
  immoDates : {orderId: string; immoDateFrom: Timestamp, immoDateTo: Timestamp, quantity: number}[]
}
