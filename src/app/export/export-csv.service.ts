import { Injectable } from '@angular/core';
import {ComputePriceService} from "../price/compute-price.service";
import {UtilServices} from "../common-services/utilServices";

@Injectable({
  providedIn: 'root'
})

export class ExportCsvService {

  constructor(private computePriceService: ComputePriceService) { }

  private static convertToCSV(objArray) {
    let array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    let str = '';
    for (let i = 0; i < array.length; i++) {
      let line = '';
      for (let index in array[i]) {
        if (line != '') line += ';';
        if (array[i].hasOwnProperty(index)) {
          line += array[i][index];
        }
      }
      str += line + '\r\n';
    }
    return str;
  }

  private static exportCSVFile(headers, invoicesTable, fileTitle) {
    if (headers) {
      invoicesTable.unshift(headers);
    }

    // Convert Object to JSON
    let jsonInvoicesTable = JSON.stringify(invoicesTable);

    let csv = ExportCsvService.convertToCSV(jsonInvoicesTable);

    let exportedFilenmae = fileTitle + '.csv' || 'export.csv';

    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
      navigator.msSaveBlob(blob, exportedFilenmae);
    } else {
      let link = document.createElement("a");
      if (link.download !== undefined) { // feature detection
        // Browsers that support HTML5 download attribute
        let url = URL.createObjectURL(blob);
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
    invoiceDate:"Date facture",
    price: "prix total ht",
    rentalDiscountAmount:"Remise en € sur location",
    saleDiscountAmount:"Remise en € sur vente",
    discountPrice: "Prix total remisé"
  };


  private invoicesTable = [];

  public wantExportOrderCsvFromPageExport(advanceInvoiceData, balanceInvoiceData) {
    this.invoicesTable = [];

    advanceInvoiceData.forEach((invoiceData) => { // ligne de facture d'acompte
      this.pushInvoice(invoiceData, invoiceData.numerosInvoice.advance, 'advance');
    });

    balanceInvoiceData.forEach((invoiceData) => { // ligne de facture de solde
      this.pushInvoice(invoiceData, invoiceData.numerosInvoice.balance, 'balance');
    });

  let fileTitle = 'invoices'; // or 'my-unique-title'

  ExportCsvService.exportCSVFile(this.headers, this.invoicesTable, fileTitle); // call the exportCSVFile() function to process the JSON and trigger the download
  }

  public wantExportOrderCsv(invoices) {
    this.invoicesTable = [];
    invoices.forEach((invoice) => {
      this.pushInvoice(invoice.invoice, invoice.numeroInvoice, invoice.type);
    });
    let fileTitle = 'invoices'; // or 'my-unique-title'
    ExportCsvService.exportCSVFile(this.headers, this.invoicesTable, fileTitle); // call the exportCSVFile() function to process the JSON and trigger the download
  }

  private pushInvoice(invoice, numeroInvoice, invoiceType) {
    //console.log("invoice : ", invoice);
    if (numeroInvoice != null || numeroInvoice != undefined) { // si le numéro de facture est renseigné, on pousse la facture
      // pour assurer la compatibilité avec les anciens devis fait avant les multiples  produits composés
      invoice = ExportCsvService.setCompositeProductsIfUndefined(invoice);

      let singleProductArray = [];
      if (invoice.singleProduct !== undefined) {
        for (let i=0; i<invoice.singleProduct.length; i++) {
            if (invoice.singleProduct[i].name != undefined && invoice.singleProductAmount[i] !== 0) {
            singleProductArray.push(invoice.singleProduct[i].name + " : "+ invoice.singleProductAmount[i]);
          }
        }
      }
      const singleProduct =  singleProductArray.join(' - ');

      let compositeProductArray = [];
      let compositeProductAmount = '';
      if (invoice.compositeProducts !== undefined) {
        invoice.compositeProducts.forEach((compositeProductElements)=>{
          if (compositeProductElements.compositeProductElements[0].name != undefined) {
            compositeProductArray.push(compositeProductElements.compositeProductElements[0].name);
            if (typeof (invoice.compositeProductAmount[0]) === "number" && invoice.compositeProductAmount[0] !== 0) {
              compositeProductAmount = invoice.compositeProductAmount[0];
            }
          }
        });
      }
      const compositeProducts =  compositeProductArray.join(' - ');

      let specialProductArray = [];
      if (invoice.specialProduct !== undefined) {
        for (let i = 0; i < invoice.specialProduct.length; i++) {
            if (invoice.specialProduct[i] != undefined && invoice.specialProductPrice[i] !== 0) {
              specialProductArray.push(invoice.specialProduct[i] + " : " + invoice.specialProductPrice[i]);
            }
          }
      }
      const specialProduct =  specialProductArray.join(' - ');

      const prices = this.computePriceService.computePrices(invoice);
      let price = 0, rentalDiscountAmount = 0, saleDiscountAmount = 0, discountPrice = 0, invoiceDate;
      if (invoiceType === "advance" ) {
        price = prices.price*Number(invoice.advanceRate)/100; // prix facture d'acompte
        rentalDiscountAmount = prices.rentalDiscountAmount*Number(invoice.advanceRate)/100;
        saleDiscountAmount = prices.saleDiscountAmount*Number(invoice.advanceRate)/100;
        discountPrice = prices.discountPrice*Number(invoice.advanceRate)/100;
        invoiceDate = UtilServices.getDate(invoice.orderDate);
      } else if (invoiceType === "balance") {
        price = prices.price*(100-Number(invoice.advanceRate))/100;
        rentalDiscountAmount = prices.rentalDiscountAmount*(100-Number(invoice.advanceRate))/100;
        saleDiscountAmount = prices.saleDiscountAmount*(100-Number(invoice.advanceRate))/100;
        discountPrice = prices.discountPrice*(100-Number(invoice.advanceRate))/100;
        invoiceDate = UtilServices.getDate(invoice.balanceInvoiceDate);
      }

      this.invoicesTable.push({
        numeroInvoice: numeroInvoice,
        invoiceId: invoice.id,
        clientName: invoice.client.name.replace(/;/g, ' '),
        clientAddress: invoice.client.address.replace(/;/g, ' '),
        clientZipcode: invoice.client.zipcode.toString().replace(/;/g, ' '),
        clientTown: invoice.client.town.replace(/;/g, ' '),
        contactName: invoice.contact.contactName.replace(/;/g, ' '),
        contactPhone: invoice.contact.contactPhone.replace(/;/g, ' '),
        contactEmail: invoice.contact.contactEmail.replace(/;/g, ' '),
        employe: invoice.employe.name.replace(/;/g, ' '),
        singleProduct: singleProduct.replace(/;/g, ' '),
        compositeProducts: compositeProducts.replace(/;/g, ' '),
        compositeProductAmount: compositeProductAmount,
        specialProduct: specialProduct.toString().replace(/;/g, ' '),
        rentDateFrom: UtilServices.getDate(invoice.rentDateFrom),
        rentDateTo: UtilServices.getDate(invoice.rentDateTo),
        invoiceDate: invoiceDate,
        price: UtilServices.formatToTwoDecimal(price).toString().replace('.',','),
        rentalDiscountAmount: UtilServices.formatToTwoDecimal(rentalDiscountAmount).toString().replace('.',','),
        saleDiscountAmount : UtilServices.formatToTwoDecimal(saleDiscountAmount).toString().replace('.',','),
        discountPrice : UtilServices.formatToTwoDecimal(discountPrice).toString().replace('.',','),
      });
    }
  }

  private static setCompositeProductsIfUndefined(item) {
    if (item.compositeProducts==undefined) {
      item.compositeProductAmount = [item.compositeProductAmount];
      item.compositeProducts=[{compositeProductElements: item.compositeProduct}];
    }
    return item;
  }
}
