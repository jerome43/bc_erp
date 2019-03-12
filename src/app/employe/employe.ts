import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
export class Employe {
  name: string;
  address: string;
  zipcode: number;
  town: string;
  phone: string;
  cellPhone: string;
  email: string;
  date: Timestamp;
}
