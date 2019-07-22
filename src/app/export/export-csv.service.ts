import { Injectable } from '@angular/core';
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
import {ComputePriceService} from "../price/compute-price.service";

@Injectable({
  providedIn: 'root'
})
export class ExportCsvService {

  constructor(private computePriceService: ComputePriceService) { }

  convertToCSV(objArray) {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';

    for (var i = 0; i < array.length; i++) {
      var line = '';
      for (var index in array[i]) {
        if (line != '') line += ';';

        line += array[i][index];
      }

      str += line + '\r\n';
    }
    return str;
  }

  exportCSVFile(headers, items, fileTitle) {
    if (headers) {
      items.unshift(headers);
    }

    // Convert Object to JSON
    var jsonObject = JSON.stringify(items);

    var csv = this.convertToCSV(jsonObject);

    var exportedFilenmae = fileTitle + '.csv' || 'export.csv';

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
      navigator.msSaveBlob(blob, exportedFilenmae);
    } else {
      var link = document.createElement("a");
      if (link.download !== undefined) { // feature detection
        // Browsers that support HTML5 download attribute
        var url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", exportedFilenmae);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  private headers = {
    numeroInvoice: "Numéro de facture",
    invoiceId: "Numéro de commande",
    clientName: "Nom Client",
    clientAddress: "Adresse Client",
    clientZipcode: "Code postal Client",
    clientTown: "Ville Client",
    contactName: "Nom Contact",
    contactPhone: "Téléphone contact",
    contactEmail: "Email contact",
    employe: "Commercial BC",
    singleProduct: "Nom et quantité produits simples",
    compositeProducts: "'Nom produits composé",
    compositeProductAmount: "Quantité produits composés",
    specialProduct: "Nom et prix produits spéciaux",
    rentDateFrom: "Début date location",
    rentDateTo: "Fin date location",
    //immoDateFrom: "Début date immobilisation",
    //immoDateTo: "Fin date d'immobilisation",
    //quotationComment: "Commentaire devis",
    //quotationDate: "Date devis",
    //relaunchClientDate: "Date relance client",
    //orderDate: "Date commande",
    //scanOrder: "scan devis signé",
    invoiceDate:"Date facture",
    //orderComment: "Commentaire facture",
    //deliveryComment: "Commentaire bon de livraison",
    price: "prix total ht",
    rentalDiscountAmount:"Remise en € sur location",
    saleDiscountAmount:"Remise en € sur vente",
    discountPrice: "Prix total remisé"
  };


  private itemsFormatted = [];

  wantExportOrderCsv(advanceInvoiceData, balanceInvoiceData) {
    this.itemsFormatted = [];


    advanceInvoiceData.forEach((item) => { // ligne de facture d'acompte
      if (item.numerosInvoice.advance!=null || item.numerosInvoice.advance!=undefined) {// si le numéro de facture d'acompte est renseignée, on pousse la facture d'acompte
        // pour assurer la compatibilité avec les anciens devis fait avant les multiples  produits composés
        if (item.compositeProducts==undefined) {
          item.compositeProductAmount = [item.compositeProductAmount];
          item.compositeProducts=[{compositeProductElements: item.compositeProduct}];
        }

        const numeroInvoice = item.numerosInvoice.advance;
        const invoiceId = item.id;
        const clientName = item.client.name;
        const clientAddress = item.client.address;
        const clientZipcode = item.client.zipcode;
        const clientTown = item.client.town;
        const contactName = item.contact.contactName;
        const contactPhone = item.contact.contactPhone;
        const contactEmail = item.contact.contactEmail;
        const employe = item.employe.name;
        var singleProductArray = [];
        for (var i=0; i<item.singleProduct.length; i++) {
          singleProductArray.push(item.singleProduct[i].name + " : "+ item.singleProductAmount[i]);
        }
        const singleProduct =  singleProductArray.join(' - ');
        var compositeProductArray = [];
        item.compositeProducts.forEach((compositeProductElements)=>{
          console.log("compositeProductElements ", compositeProductElements);
          compositeProductArray.push(compositeProductElements.compositeProductElements[0].name);
        });
        const compositeProducts =  compositeProductArray.join(' - ');
        const compositeProductAmount= item.compositeProductAmount;

        var specialProductArray = [];
        for (var i=0; i<item.specialProduct.length; i++) {
          specialProductArray.push(item.specialProduct[i] + " : "+ item.specialProductPrice[i]);
        }
        const specialProduct =  specialProductArray.join(' - ');


        const rentDateFrom = this.getDate(item.rentDateFrom);
        const rentDateTo= this.getDate(item.rentDateTo);
        //const  immoDateFrom= this.getDate(item.immoDateFrom);
        //const  immoDateTo= this.getDate(item.immoDateTo);
        //const  quotationComment= item.quotationComment;
        //const  quotationDate= this.getDate(item.quotationDate);
        //const  relaunchClientDate= this.getDate(item.relaunchClientDate);
        const orderDate= this.getDate(item.orderDate);
        //const  scanOrder= item.scanOrder;
        //const  orderComment= item.orderComment;
        //const  deliveryComment= item.deliveryComment;
        var prices = this.computePriceService.computePrices(item);
        var price = prices.price*Number(item.advanceRate)/100; // prix facture d'acompte
        var rentalDiscountAmount= prices.rentalDiscountAmount*Number(item.advanceRate)/100;
        var saleDiscountAmount= prices.saleDiscountAmount*Number(item.advanceRate)/100;
        var discountPrice = prices.discountPrice*Number(item.advanceRate)/100;

        this.itemsFormatted.push({
          //model: item.model.replace(/;/g, ' '), // remove commas to avoid errors,
          numeroInvoice: numeroInvoice,
          invoiceId: invoiceId,
          clientName: clientName.replace(/;/g, ' '),
          clientAddress: clientAddress.replace(/;/g, ' '),
          clientZipcode: clientZipcode.toString().replace(/;/g, ' '),
          clientTown: clientTown.replace(/;/g, ' '),
          contactName: contactName.replace(/;/g, ' '),
          contactPhone: contactPhone.replace(/;/g, ' '),
          contactEmail: contactEmail.replace(/;/g, ' '),
          employe: employe.replace(/;/g, ' '),
          singleProduct: singleProduct.replace(/;/g, ' '),
          compositeProducts: compositeProducts.replace(/;/g, ' '),
          compositeProductAmount: compositeProductAmount.toString().replace(/;/g, ' '),
          specialProduct: specialProduct.toString().replace(/;/g, ' '),
          rentDateFrom: rentDateFrom,
          rentDateTo: rentDateTo,
          //immoDateFrom: immoDateFrom,
          //immoDateTo: immoDateTo,
          //quotationComment: quotationComment.replace(/;/g, ' '),
          //quotationDate: quotationDate,
          //relaunchClientDate: relaunchClientDate,
          //scanOrder: scanOrder.replace(/;/g, ' '),
          invoiceDate: orderDate,
          //orderComment: orderComment.replace(/;/g, ' '),
          //deliveryComment: deliveryComment.replace(/;/g, ' '),
          price: price,
          rentalDiscountAmount: rentalDiscountAmount,
          saleDiscountAmount: saleDiscountAmount,
          discountPrice : discountPrice,
        });
      }
    });

    balanceInvoiceData.forEach((item) => { // ligne de facture de solde

      if (item.numerosInvoice.balance!=null || item.numerosInvoice.balance!=undefined) { // si la date de facture de solde est renseignée, on pousse la facture de solde
        // pour assurer la compatibilité avec les anciens devis fait avant les multiples  produits composés
        if (item.compositeProducts==undefined) {
          item.compositeProductAmount = [item.compositeProductAmount];
          item.compositeProducts=[{compositeProductElements: item.compositeProduct}];
        }

        const numeroInvoice = item.numerosInvoice.balance;
        const invoiceId = item.id;
        const clientName = item.client.name;
        const clientAddress = item.client.address;
        const clientZipcode = item.client.zipcode;
        const clientTown = item.client.town;
        const contactName = item.contact.contactName;
        const contactPhone = item.contact.contactPhone;
        const contactEmail = item.contact.contactEmail;
        const employe = item.employe.name;
        var singleProductArray = [];
        for (var i=0; i<item.singleProduct.length; i++) {
          singleProductArray.push(item.singleProduct[i].name + " : "+ item.singleProductAmount[i]);
        }
        const singleProduct =  singleProductArray.join(' - ');
        var compositeProductArray = [];
        item.compositeProducts.forEach((compositeProductElements)=>{
          compositeProductArray.push(compositeProductElements.compositeProductElements[0].name);
        });
        const compositeProducts =  compositeProductArray.join(' - ');
        const compositeProductAmount= item.compositeProductAmount;
        var specialProductArray = [];
        for (var i=0; i<item.specialProduct.length; i++) {
          specialProductArray.push(item.specialProduct[i] + " : "+ item.specialProductPrice[i]);
        }
        const specialProduct =  specialProductArray.join(' - ');
        const rentDateFrom = this.getDate(item.rentDateFrom);
        const rentDateTo= this.getDate(item.rentDateTo);
        //const  immoDateFrom= this.getDate(item.immoDateFrom);
        //const  immoDateTo= this.getDate(item.immoDateTo);
        //const  quotationComment= item.quotationComment;
        //const  quotationDate= this.getDate(item.quotationDate);
        //const  relaunchClientDate= this.getDate(item.relaunchClientDate);
        //const  scanOrder= item.scanOrder;
        const  balanceInvoiceDate= this.getDate(item.balanceInvoiceDate);
        //const  orderComment= item.orderComment;
        //const  deliveryComment= item.deliveryComment;
        const prices = this.computePriceService.computePrices(item);
        // prix facture de solde spécifiques
        var price = prices.price*(100-Number(item.advanceRate))/100;
        var rentalDiscountAmount= prices.rentalDiscountAmount*(100-Number(item.advanceRate))/100;
        var saleDiscountAmount= prices.saleDiscountAmount*(100-Number(item.advanceRate))/100;
        var discountPrice = prices.discountPrice*(100-Number(item.advanceRate))/100;

        this.itemsFormatted.push({
          //model: item.model.replace(/;/g, ' '), // remove commas to avoid errors,
          numeroInvoice: numeroInvoice,
          invoiceId: invoiceId,
          clientName: clientName.replace(/;/g, ' '),
          clientAddress: clientAddress.replace(/;/g, ' '),
          clientZipcode: clientZipcode.toString().replace(/;/g, ' '),
          clientTown: clientTown.replace(/;/g, ' '),
          contactName: contactName.replace(/;/g, ' '),
          contactPhone: contactPhone.replace(/;/g, ' '),
          contactEmail: contactEmail.replace(/;/g, ' '),
          employe: employe.replace(/;/g, ' '),
          singleProduct: singleProduct.replace(/;/g, ' '),
          compositeProducts: compositeProducts.replace(/;/g, ' '),
          compositeProductAmount: compositeProductAmount.toString().replace(/;/g, ' '),
          specialProduct: specialProduct.toString().replace(/;/g, ' '),
          rentDateFrom: rentDateFrom,
          rentDateTo: rentDateTo,
          //immoDateFrom: immoDateFrom,
          //immoDateTo: immoDateTo,
          //quotationComment: quotationComment.replace(/;/g, ' '),
          //quotationDate: quotationDate,
          //relaunchClientDate: relaunchClientDate,
          //orderDate: orderDate,
          //scanOrder: scanOrder.replace(/;/g, ' '),
          invoiceDate: balanceInvoiceDate,
          //orderComment: orderComment.replace(/;/g, ' '),
          //deliveryComment: deliveryComment.replace(/;/g, ' '),
          price: price,
          rentalDiscountAmount: rentalDiscountAmount,
          saleDiscountAmount : saleDiscountAmount,
          discountPrice : discountPrice,
        });
      }

    });

  var fileTitle = 'orders'; // or 'my-unique-title'

  this.exportCSVFile(this.headers, this.itemsFormatted, fileTitle); // call the exportCSVFile() function to process the JSON and trigger the download
  }

  getDate(timestamp) {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString("fr-FR");
    }
    else {return '';}
  }

}
