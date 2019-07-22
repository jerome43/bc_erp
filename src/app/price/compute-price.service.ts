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

    var rentalDiscount, saleDiscount;
    if (data.client.discount === undefined ) { // pour assurer la compatibilité avec les devis et commandes antérieurs à juillet 2019
      rentalDiscount = Number(data.client.rentalDiscount);
      saleDiscount = Number(data.client.saleDiscount);
      //console.log("case 1");
    }
    else {
      if (data.client.discount != null && data.client.discount != "undefined" && data.client.discount !='') {
      rentalDiscount = Number(data.client.discount);
      saleDiscount = Number(data.client.discount);
      //console.log("case 2");
      }
      else {
        rentalDiscount=0;
        saleDiscount =0;
        //console.log("case 3");
      }
    }

    //const discountPrice = price - price*rentalDiscount/100;
    const rentalDiscountAmount = this.getRentalProductsDiscountAmount(numberOfRentDays, data, rentalDiscount);
    const saleDiscountAmount = this.getSaleProductsDiscountAmount(data, saleDiscount);
    const discountPrice = price - rentalDiscountAmount - saleDiscountAmount;
    //console.log("COMPUTEPRICE :  - data.client.discount ", data.client.discount, " - price : ", price, " - rentalDiscount : ", rentalDiscount, " - saleDiscount :", saleDiscount, " - rentalDiscountAmount : ", rentalDiscountAmount, " - saleDiscountAmount : ", saleDiscountAmount, " - discountPrice : ", discountPrice);

    return {price: price, rentalDiscount: rentalDiscount, saleDiscount: saleDiscount, rentalDiscountAmount: rentalDiscountAmount, saleDiscountAmount: saleDiscountAmount, discountPrice: discountPrice};
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

    for (var idxPdt=0; idxPdt<data.compositeProducts.length; idxPdt++) {
      for (var i=0; i<data.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (data.compositeProducts[idxPdt].compositeProductElements[i]!="") {
          if (data.compositeProducts[idxPdt].compositeProductElements[i].type==="sale" || data.compositeProducts[idxPdt].compositeProductElements[i].type==="service") {
            console.log("getcompositeProductElementsPrice type === sale or service", Number(data.compositeProducts[idxPdt].compositeProductElements[i].sell_price*data.compositeProductAmount[idxPdt]));
            price+=Number(data.compositeProducts[idxPdt].compositeProductElements[i].sell_price*data.compositeProductAmount[idxPdt]);
          }
          else {
            if (numberOfRentDays>=1) {
              var degressivity;
              data.compositeProducts[idxPdt].compositeProductElements[i].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
              console.log("getcompositeProductElementsPrice type === rental", Number(data.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * data.compositeProductAmount[idxPdt] * degressivity);
              numberOfRentDays > 1 ? price += Number(data.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * data.compositeProductAmount[idxPdt] * degressivity : price += Number(data.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * data.compositeProductAmount[idxPdt]
            }
          }
        }
      }
    }


    for (var i=0; i<data.specialProduct.length; i++) {
      if (data.specialProduct[i]!="" && data.specialProductPrice[i]!="" && typeof data.specialProductPrice[i] =='number') {
          price+=Number(data.specialProductPrice[i]);
      }
    }

    console.log("price : ", price);
    return price
  }

  getRentalProductsDiscountAmount(numberOfRentDays:number, data, rentalDiscount):number {
    console.log("getProductsDiscountAmount - data : ", data);
    var totalRentalProductsPrice:number = 0;
    for (var i = 0; i < data.singleProduct.length; i++) {
      if (data.singleProduct[i] != "" && data.singleProduct[i].type === "rental" && numberOfRentDays >= 1) {
        var degressivity;
        data.singleProduct[i].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
        console.log("getSingleProductsPrice type == rental", Number(data.singleProduct[i].rent_price) * data.singleProductAmount[i] * degressivity);
        numberOfRentDays > 1 ? totalRentalProductsPrice += Number(data.singleProduct[i].rent_price) * data.singleProductAmount[i] * degressivity : totalRentalProductsPrice += Number(data.singleProduct[i].rent_price) * data.singleProductAmount[i]
      }
    }
    //console.log("totalRentalProductsPrice single products: ", totalRentalProductsPrice);
    for (var idxPdt=0; idxPdt<data.compositeProducts.length; idxPdt++) {
      for (var i = 0; i < data.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (data.compositeProducts[idxPdt].compositeProductElements[i] != "" && data.compositeProducts[idxPdt].compositeProductElements[i].type === "rental" && numberOfRentDays >= 1) {
          var degressivity;
          data.compositeProducts[idxPdt].compositeProductElements[i].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
          console.log("getCompositeProductsElementPrice type === rental", Number(data.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * data.compositeProductAmount[idxPdt] * degressivity);
          numberOfRentDays > 1 ? totalRentalProductsPrice += Number(data.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * data.compositeProductAmount[idxPdt] * degressivity : totalRentalProductsPrice += Number(data.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * data.compositeProductAmount[idxPdt]
        }
      }
    }
    console.log("totalRentalProductsPrice : ", totalRentalProductsPrice);
    return totalRentalProductsPrice*rentalDiscount/100;
  }

  getSaleProductsDiscountAmount(data, saleDiscount):number {
    console.log("getSaleProductsDiscountAmount - data : ", data);
    var totalSaleProductsPrice:number = 0;
    for (var i = 0; i < data.singleProduct.length; i++) {
      if (data.singleProduct[i] != "" && data.singleProduct[i].type === "sale") {
        totalSaleProductsPrice += Number(data.singleProduct[i].sell_price) * data.singleProductAmount[i];
      }
    }

    //console.log("totalSaleProductsPrice single products: ", totalSaleProductsPrice);
    for (var idxPdt=0; idxPdt<data.compositeProducts.length; idxPdt++) {
      for (var i = 0; i < data.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (data.compositeProducts[idxPdt].compositeProductElements[i] != "" && data.compositeProducts[idxPdt].compositeProductElements[i].type === "sale") {
          //console.log("getCompositeProductsPrice type === sale", data.compositeProducts[idxPdt].compositeProductElements[i].sell_price * data.compositeProductAmount);
          totalSaleProductsPrice += Number(data.compositeProducts[idxPdt].compositeProductElements[i].sell_price) * data.compositeProductAmount[idxPdt];
        }
      }
    }
    console.log("totalSaleProductsPrice : ", totalSaleProductsPrice);
    return totalSaleProductsPrice*saleDiscount/100;
  }

  getCompositeProductElementPrice(compositeProductElement) {
    console.log("getCompositeProductElementPrice ", compositeProductElement);
    var price:number = 0;
    for (var i=0; i<compositeProductElement.length; i++) {
      if (compositeProductElement[i]!="") {
        if (compositeProductElement[i].type === "sale" || compositeProductElement[i].type === "service") {
          console.log("getCompositeProductElementPrice type === sale or service", Number(compositeProductElement[i].sell_price));
          price+=Number(compositeProductElement[i].sell_price);
        }
        else {
          console.log("getCompositeProducElementPrice type === rental", Number(compositeProductElement[i].rent_price));
          price+=Number(compositeProductElement[i].rent_price);
        }
      }
    }

    console.log("getCompositeProductElementPrice : ", price);
    return price
  }
}
