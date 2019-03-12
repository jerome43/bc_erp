import { Injectable } from '@angular/core';
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;

@Injectable({
  providedIn: 'root'
})
export class ComputePriceService {

  constructor() { }

  computePrices(data): any {
    const numberOfRentDays = this.getNumberOfRentDaysComputed(data.rentDateFrom, data.rentDateTo);
    const price = this.getTotalProductsPrice(numberOfRentDays, data);
    const discount = Number(data.client.discount);
    const discountPrice = price - price*discount/100;
    return {price: price, discount: discount, discountPrice: discountPrice};
  }


  getNumberOfRentDaysComputed (dateFrom, dateTo): number { // calcul le nombre de jours de location à appliquer en fonction des dates de location
    var numberOfRentDays = 0;
    if (dateFrom instanceof Date && dateTo instanceof  Date) { // parfois les datas proviennent des formulaire et les dates sont au format Date
      console.log('instanceof Date');
      numberOfRentDays = Math.abs(dateTo.getTime()/86400000 - dateFrom.getTime()/86400000)+1;
    }
    else if (dateFrom instanceof Timestamp && dateTo instanceof  Timestamp) { // parfois les datas proviennent de firebase et les dates sont au format Timestamp
      console.log('instanceof TimeStamp');
      numberOfRentDays = Math.abs(dateTo.toDate().getTime()/86400000 - dateFrom.toDate().getTime()/86400000)+1;
    }
    console.log("getNumberOfRentDaysComputed : ", numberOfRentDays);
    return Number(numberOfRentDays);
  }

  getTotalProductsPrice(numberOfRentDays:number, data):number {
    console.log("getTotalProductsPrice - data : ", data);
    var price:number = 0;
      for (var i=0; i<data.singleProduct.length; i++) {
        if (data.singleProduct[i]!="") {
          if (data.singleProduct[i].type==="sale" || data.singleProduct[i].type==="service") {
            console.log("getSingleProductsPrice type == sale or service", Number(data.singleProduct[i].sell_price*data.singleProductAmount[i]));
            price+=Number(data.singleProduct[i].sell_price*data.singleProductAmount[i]);
          }
          else {
            if (numberOfRentDays>=1) {
              var degressivity;
              data.singleProduct[i].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
              console.log("getSingleProductsPrice type == rental", Number(data.singleProduct[i].rent_price) * data.singleProductAmount[i] * degressivity);
              numberOfRentDays > 1 ? price += Number(data.singleProduct[i].rent_price) * data.singleProductAmount[i] * degressivity : price += Number(data.singleProduct[i].rent_price) * data.singleProductAmount[i]
            }
          }
        }
      }

      console.log("price : ", price);

      for (var i=0; i<data.compositeProduct.length; i++) {
        if (data.compositeProduct[i]!="") {
          if (data.compositeProduct[i].type==="sale" || data.compositeProduct[i].type==="service") {
            console.log("getCompositeProductsPrice type === sale or service", Number(data.compositeProduct[i].sell_price*data.compositeProductAmount));
            price+=Number(data.compositeProduct[i].sell_price*data.compositeProductAmount);
          }
          else {
            if (numberOfRentDays>=1) {
              var degressivity;
              data.compositeProduct[i].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
              console.log("getCompositeProductsPrice type === rental", Number(data.compositeProduct[i].rent_price) * data.compositeProductAmount * degressivity);
              numberOfRentDays > 1 ? price += Number(data.compositeProduct[i].rent_price) * data.compositeProductAmount * degressivity : price += Number(data.compositeProduct[i].rent_price) * data.compositeProductAmount
            }
          }
        }
      }

    price+=Number(data.specialProductPrice);
    console.log("price : ", price);
    return price
  }
}
