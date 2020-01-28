import {Injectable} from "@angular/core";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;

@Injectable({
  providedIn: 'root'
})

export class UtilServices {

  public static formatToTwoDecimal(x) {
    return Number.parseFloat(x).toFixed(2);
  }

  public static getDateYearAndMonth(date):string {
    if (date instanceof Date) {
      return date.getFullYear()+'-'+(date.getMonth()+1); // !!! attention la propriété getMonth() retourne un entier entre 0 (janvier) et 11 (décembre)
    }
    else return "";
  }

  public static getDate(timestamp) {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString("fr-FR");
    }
    else {return '';}
  }

}
