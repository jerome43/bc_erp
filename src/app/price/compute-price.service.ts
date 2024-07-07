import { Injectable } from '@angular/core';
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
import {ProductType} from "../product/ProductType";

@Injectable({
  providedIn: 'root'
})
export class ComputePriceService {

  constructor() { }

  /**
   * Renvoie un objet avec le prix total et remisé d'une commande
   * @param order
   */
  public computePrices(order): any {
    const numberOfRentDays = ComputePriceService.getNumberOfRentDaysComputed(order.rentDateFrom, order.rentDateTo);
    const numberOfRentMonths = ComputePriceService.getNumberOfMonths(order.rentDateFrom, order.rentDateTo);
    const price = ComputePriceService.getTotalProductsPrice(numberOfRentDays, numberOfRentMonths, order);
    let rentalDiscount, saleDiscount;
    if (order.client.discount === undefined ) {
      rentalDiscount = Number(order.client.rentalDiscount);
      saleDiscount = Number(order.client.saleDiscount);
    } else {
      /* pour assurer la compatibilité avec les devis et commandes antérieurs à juillet 2019 */
      if (order.client.discount != null && order.client.discount != "undefined" && order.client.discount !='') {
        rentalDiscount = Number(order.client.discount);
        saleDiscount = Number(order.client.discount);
      } else {
        rentalDiscount=0;
        saleDiscount =0;
      }
    }

    const rentalDiscountAmount = ComputePriceService.getRentalProductsDiscountAmount(numberOfRentDays, numberOfRentMonths, order, rentalDiscount);
    const saleDiscountAmount = ComputePriceService.getSaleProductsDiscountAmount(order, saleDiscount);
    const discountPrice = price - rentalDiscountAmount - saleDiscountAmount;
    return {
      price: price,
      rentalDiscount: rentalDiscount,
      saleDiscount: saleDiscount,
      rentalDiscountAmount: rentalDiscountAmount,
      saleDiscountAmount: saleDiscountAmount,
      discountPrice: discountPrice,
    }
  }

  /**
   * Renvoie le prix total d'un produit composé
   */
  public static getCompositeProductElementPrice(compositeProductElement) {
    //console.log("getCompositeProductElementPrice ", compositeProductElement);
    let price:number = 0;
    for (let i=0; i<compositeProductElement.length; i++) {
      if (compositeProductElement[i]!="") {
        if (compositeProductElement[i].type === ProductType.sale || compositeProductElement[i].type === ProductType.service || compositeProductElement[i].type === ProductType.serviceContract) {
          //console.log("getCompositeProductElementPrice type === sale or service or serviceContract", Number(compositeProductElement[i].sell_price));
          price += Number(compositeProductElement[i].sell_price);
        } else {
          //console.log("getCompositeProducElementPrice type === rental or longRental", Number(compositeProductElement[i].rent_price));
          price += Number(compositeProductElement[i].rent_price);
        }
      }
    }
    console.log("getCompositeProductElementPrice : ", price);
    return price
  }

  /**
   * calcule le nombre de jours de location à appliquer en fonction des dates de location
   */
  public static getNumberOfRentDaysComputed (dateFrom, dateTo): number {
    let numberOfRentDays = 0;
    if (dateFrom instanceof Date && dateTo instanceof  Date) { // parfois les datas proviennent des formulaire et les dates sont au format Date
      //console.log('instanceof Date');
      numberOfRentDays = Math.abs(dateTo.getTime()/86400000 - dateFrom.getTime()/86400000)+1;
    }
    else if (dateFrom instanceof Timestamp && dateTo instanceof  Timestamp) { // parfois les datas proviennent de firebase et les dates sont au format Timestamp
      //console.log('instanceof TimeStamp');
      numberOfRentDays = Math.abs(dateTo.toDate().getTime()/86400000 - dateFrom.toDate().getTime()/86400000)+1;
    }
    //console.log("getNumberOfRentDaysComputed : ", numberOfRentDays);
    return Number(numberOfRentDays);
  }

  /**
   * Renvoie le nombre de mois écoulés de date à date
   * @param dateFrom
   * @param dateTo
   */
  public static getNumberOfMonths(dateFrom, dateTo): number {
    let numberOfMonths = 0;
    if (dateFrom instanceof Date && dateTo instanceof  Date) { // parfois les datas proviennent des formulaire et les dates sont au format Date
      //console.log('instanceof Date');
      const years = dateTo.getFullYear() - dateFrom.getFullYear();
      const monthFrom = dateFrom.getMonth();
      const monthTo = dateTo.getMonth();
      numberOfMonths = ComputePriceService.calcNumberOfMonths(monthFrom, monthTo, years);
    }
    else if (dateFrom instanceof Timestamp && dateTo instanceof  Timestamp) { // parfois les datas proviennent de firebase et les dates sont au format Timestamp
      //console.log('instanceof TimeStamp');
      const years = dateTo.toDate().getFullYear() - dateFrom.toDate().getFullYear();
      const monthFrom = dateFrom.toDate().getMonth();
      const monthTo = dateTo.toDate().getMonth();
      numberOfMonths = ComputePriceService.calcNumberOfMonths(monthFrom, monthTo, years);
    }
    //console.log("getNumberOfMonths : ", numberOfMonths);
    return numberOfMonths;
  }

  /**
   * Calcule le nombre de mois écoulés
   * @param monthFrom
   * @param monthTo
   * @param years
   */
  private static calcNumberOfMonths(monthFrom, monthTo, years):number {
    let numberOfMonths = 0;
    if (monthFrom <= monthTo && years === 0) {
      numberOfMonths = monthTo - monthFrom + 1;
    } else if (monthFrom <= monthTo && years > 0) {
      numberOfMonths = monthTo - monthFrom + years*12 + 1;
    } else if (monthFrom >= monthTo && years > 0) {
      numberOfMonths = years*12 - (monthFrom - monthTo) + 1;
    }
    return Number(numberOfMonths);
  }

  /**
   * Calcul de la marge
   * @param externalCosts
   * @param price
   */
  public static calcMarge(externalCosts : Array<{ name : string, amount : number }>, price : number) {
    let sum = 0;
    externalCosts.forEach((item)=>{
      sum += item.amount;
    });
    return price - sum;
  }

  /**
   * Récupération de la totalité des coûts externes d'une commande
   * @param externalCosts
   */
  public static getExternalCost(externalCosts : Array<{ name : string, amount : number }>): number {
    let sum: number = 0;
    externalCosts.forEach((item)=>{
      sum += item.amount;
    });
    return sum;
  }

  /**
   * Calcule et renvoie le prix total d'une commande, sans la remise
   * @param numberOfRentDays
   * @param numberOfRentMonths
   * @param order
   */
  private static getTotalProductsPrice(numberOfRentDays:number, numberOfRentMonths : number, order):number {
    //console.log("getTotalProductsPrice - order : ", order);
    let price : number = 0;

    /* AJOUT PRIX DES PRODUITS SIMPLES */
      for (let i=0; i<order.singleProduct.length; i++) {
        if (order.singleProduct[i]!="") {
          if (order.singleProduct[i].type === ProductType.sale || order.singleProduct[i].type === ProductType.service || order.singleProduct[i].type === ProductType.serviceContract) {
            //console.log("getSingleProductsPrice type == sale or service", Number(order.singleProduct[i].sell_price*order.singleProductAmount[i]));
            price += Number(order.singleProduct[i].sell_price * order.singleProductAmount[i]);
          } else if (order.singleProduct[i].type === ProductType.longRental) {
            let degressivity;
            order.singleProduct[i].apply_degressivity === "true" ? degressivity = 1 + (numberOfRentMonths -1 ) / 4 : degressivity = numberOfRentMonths;
            degressivity < 1 ? degressivity = 1 : null;// par sécurité, au cas où
            price += Number(order.singleProduct[i].rent_price) * order.singleProductAmount[i] * degressivity;
          } else {
            if (numberOfRentDays>=1) {
              let degressivity;
              order.singleProduct[i].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
              //console.log("getSingleProductsPrice type == rental", Number(order.singleProduct[i].rent_price) * order.singleProductAmount[i] * degressivity);
              numberOfRentDays > 1 ? price += Number(order.singleProduct[i].rent_price) * order.singleProductAmount[i] * degressivity : price += Number(order.singleProduct[i].rent_price) * order.singleProductAmount[i]
            }
          }
        }
      }

    /* AJOUT PRIX DES PRODUITS COMPOSES */

    /* pour assurer la compatibilité avec les anciennes commandes faites avant les multiples  produits composés */
    if (order.compositeProducts === undefined) {
      order.compositeProductAmount = [order.compositeProductAmount];
      order.compositeProducts=[{compositeProductElements: order.compositeProduct}];
    }

    for (let idxPdt=0; idxPdt<order.compositeProducts.length; idxPdt++) {
      for (let i=0; i<order.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (order.compositeProducts[idxPdt].compositeProductElements[i]!="") {
          if (order.compositeProducts[idxPdt].compositeProductElements[i].type === ProductType.sale
            || order.compositeProducts[idxPdt].compositeProductElements[i].type === ProductType.service
            || order.compositeProducts[idxPdt].compositeProductElements[i].type === ProductType.serviceContract) {
            //console.log("getcompositeProductElementsPrice type === sale or service or serviceContract", Number(order.compositeProducts[idxPdt].compositeProductElements[i].sell_price*order.compositeProductAmount[idxPdt]));
            price += Number(order.compositeProducts[idxPdt].compositeProductElements[i].sell_price * order.compositeProductAmount[idxPdt]);
          } else if (order.compositeProducts[idxPdt].compositeProductElements[i].type === ProductType.longRental) {
            let degressivity;
            order.compositeProducts[idxPdt].compositeProductElements[i].apply_degressivity === "true" ? degressivity = 1 + (numberOfRentMonths -1 ) / 4 : degressivity = numberOfRentMonths;
            degressivity < 1 ? degressivity = 1 : null;// par sécurité, au cas où
            //console.log("getcompositeProductElementsPrice type === LongRental", Number(order.compositeProducts[idxPdt].compositeProductElements[i].rent_price*order.compositeProductAmount[idxPdt] * numberOfRentMonths ));
            price += Number(order.compositeProducts[idxPdt].compositeProductElements[i].rent_price * order.compositeProductAmount[idxPdt] * degressivity);
          }
          else {
            if (numberOfRentDays>=1) {
              let degressivity;
              order.compositeProducts[idxPdt].compositeProductElements[i].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
              //console.log("getcompositeProductElementsPrice type === rental", Number(order.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * order.compositeProductAmount[idxPdt] * degressivity);
              numberOfRentDays > 1 ? price += Number(order.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * order.compositeProductAmount[idxPdt] * degressivity : price += Number(order.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * order.compositeProductAmount[idxPdt]
            }
          }
        }
      }
    }

    /* AJOUT PRIX DES PRODUITS SPECIAUX */
    if (order.specialProduct !== undefined) {
      for (let i=0; i<order.specialProduct.length; i++) {
        if (order.specialProduct[i]!="" && order.specialProductPrice[i]!="" && typeof order.specialProductPrice[i] == 'number') {
          price += Number(order.specialProductPrice[i]);
        }
      }
    }

    //console.log("price : ", price);
    return price
  }

  /**
   * Calcule et renvoie le montant total de la réduction appliquée aux produits en location d'une commande
   * @param numberOfRentDays
   * @param numberOfRentMonths
   * @param order
   * @param rentalDiscount
   */
  private static getRentalProductsDiscountAmount(numberOfRentDays : number, numberOfRentMonths : number, order, rentalDiscount) : number {
    //console.log("getProductsDiscountAmount - order : ", order);
    let price : number = 0;

    /* CALCUL DES PRODUITS SIMPLES */
    for (let i = 0; i < order.singleProduct.length; i++) {
      if (order.singleProduct[i] != "" && order.singleProduct[i].type === ProductType.rental && numberOfRentDays >= 1) {
        let degressivity;
        order.singleProduct[i].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
        //console.log("getSingleProductsPrice type == rental", Number(order.singleProduct[i].rent_price) * order.singleProductAmount[i] * degressivity);
        numberOfRentDays > 1 ? price += Number(order.singleProduct[i].rent_price) * order.singleProductAmount[i] * degressivity : price += Number(order.singleProduct[i].rent_price) * order.singleProductAmount[i]
      } else if (order.singleProduct[i].type === ProductType.longRental) {
        let degressivity;
        order.singleProduct[i].apply_degressivity === "true" ? degressivity = 1 + (numberOfRentMonths - 1) / 4 : degressivity = numberOfRentMonths;
        degressivity < 1 ? degressivity = 1 : null;
        price += Number(order.singleProduct[i].rent_price * order.singleProductAmount[i] * degressivity);
      }
    }

    /* CALCUL DES PRODUITS COMPOSES */
    for (let idxPdt=0; idxPdt<order.compositeProducts.length; idxPdt++) {
      for (let i = 0; i < order.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (order.compositeProducts[idxPdt].compositeProductElements[i] != "" && order.compositeProducts[idxPdt].compositeProductElements[i].type === ProductType.rental && numberOfRentDays >= 1) {
          let degressivity;
          order.compositeProducts[idxPdt].compositeProductElements[i].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
          //console.log("getCompositeProductsElementPrice type === rental", Number(order.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * order.compositeProductAmount[idxPdt] * degressivity);
          numberOfRentDays > 1 ? price += Number(order.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * order.compositeProductAmount[idxPdt] * degressivity : price += Number(order.compositeProducts[idxPdt].compositeProductElements[i].rent_price) * order.compositeProductAmount[idxPdt]
        } else if (order.compositeProducts[idxPdt].compositeProductElements[i].type === ProductType.longRental) {
          let degressivity;
          order.compositeProducts[idxPdt].compositeProductElements[i].apply_degressivity === "true" ? degressivity = 1 + (numberOfRentMonths - 1) / 4 : degressivity = numberOfRentMonths;
          degressivity < 1 ? degressivity = 1 : null;
          price += Number(order.compositeProducts[idxPdt].compositeProductElements[i].rent_price * order.compositeProductAmount[idxPdt] * degressivity);
        }
      }
    }
    //console.log("price : ", price);
    return price * rentalDiscount / 100;
  }

  /**
   * Calcule et renvoie le montant total de la réduction appliquée aux produits en vente d'une commande
   * @param order
   * @param saleDiscount
   */
  private static getSaleProductsDiscountAmount(order, saleDiscount):number {
    //console.log("getSaleProductsDiscountAmount - order : ", order);
    let price : number = 0;

    /* CALCUL DES PRODUITS SIMPLES */
    for (let i = 0; i < order.singleProduct.length; i++) {
      if (order.singleProduct[i] != "" && order.singleProduct[i].type === ProductType.sale) {
        price += Number(order.singleProduct[i].sell_price) * order.singleProductAmount[i];
      }
    }

    /* CALCUL DES PRODUITS COMPOSES */
    for (let idxPdt=0; idxPdt<order.compositeProducts.length; idxPdt++) {
      for (let i = 0; i < order.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (order.compositeProducts[idxPdt].compositeProductElements[i] != "" && order.compositeProducts[idxPdt].compositeProductElements[i].type === ProductType.sale) {
          //console.log("getCompositeProductsPrice type === sale", order.compositeProducts[idxPdt].compositeProductElements[i].sell_price * order.compositeProductAmount);
          price += Number(order.compositeProducts[idxPdt].compositeProductElements[i].sell_price) * order.compositeProductAmount[idxPdt];
        }
      }
    }
    //console.log("price : ", price);
    return price * saleDiscount / 100;
  }

}
