import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;

export class StockProducts {
  productId: string;
  productName: string;
  productStock: number;
  immoDates : {orderId: string; immoDateFrom: Timestamp, immoDateTo: Timestamp, quantity: number}[]
}
