import { Injectable } from '@angular/core';
//import {Order} from "../order/order"
//import html2canvas from 'html2canvas';
//import * as jsPDF from 'jspdf';
//import html2pdf from 'html2pdf.js';
import { AngularFireStorage } from '@angular/fire/storage';
import * as pdfMake from 'pdfmake/build/pdfmake.js';
import * as pdfFonts from 'pdfmake/build/vfs_fonts.js';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
import {PdfType} from './pdf-type';
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;

@Injectable({
  providedIn: 'root'
})
/**
 * ATTENTION - CETTE CLASSE N'EST PAS A JOUR (prix dégressifs...), NE PAS L'UTILISER
 */
export class PdfServiceWithPhoto {

  private id:string; // l'id du devis ou de la facture stockés dans firebase

  private pdfType:PdfType; // le type de pdf à générer

  constructor(private storage: AngularFireStorage) {
  }

  wantGeneratePdf(formValue, id, pdfType: PdfType) {
    console.log("wantGenerateAdvanceInvoicePdf : ", formValue, ' / ', id);
    this.id = id;
    this.pdfType = pdfType;
    this.getPhotosSrc(formValue);
  }

  getPhotosSrc(formValue) { // récupère les urls des photos utilisées et les encode en base64 si besoin

    var photosSrc={singleProduct : [], compositeProduct:[], logo:"data:image/jpeg;base64,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"};
    var no_image= "data:image/jpeg;base64,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";
    console.log("getPhotosSrc :", photosSrc);
    for (var i=0; i<formValue.singleProduct.length; i++) {
      if (formValue.singleProduct[i].photo!="" && formValue.singleProduct[i].photo!=undefined) {
        this.storage.ref(formValue.singleProduct[i].photo).getDownloadURL().subscribe(function (i, data) {
          console.log("singleproduct data :", data, " / i : ", i);
          this.toDataUrl(data, function(data) {
            photosSrc.singleProduct[i]= data;
          });
          if (i >= formValue.singleProduct.length - 1) {
            for (var ii=0; ii<formValue.compositeProduct.length; ii++) {
              if (formValue.compositeProduct[ii].photo!="" && formValue.compositeProduct[ii].photo!=undefined) {
                this.storage.ref(formValue.compositeProduct[ii].photo).getDownloadURL().subscribe(function (ii, data) {
                  console.log("compositeProduct data :", data, " / ii : ", ii);
                  this.toDataUrl(data, function(data) {
                    photosSrc.compositeProduct[ii]= data;
                  });
                  if (ii >= formValue.compositeProduct.length - 1) {
                    this.pdfType === PdfType.deliveryReceipt ? setTimeout(()=>{this.generateDeliveryReceiptPdf(formValue, photosSrc)}, 1000) : setTimeout(()=>{this.generateOrderOrQuotationPdf(formValue, photosSrc)}, 1000); // mis dans un timeout au cas où les autres photos n'auraient pas été chargées
                  }
                }.bind(this, ii));
              }
              else {
                photosSrc.compositeProduct[ii]= no_image;
                if (ii >= formValue.compositeProduct.length - 1) {
                  this.pdfType === PdfType.deliveryReceipt ? setTimeout(()=>{this.generateDeliveryReceiptPdf(formValue, photosSrc)}, 1000) : setTimeout(()=>{this.generateOrderOrQuotationPdf(formValue, photosSrc)}, 1000); // mis dans un timeout au cas où les autres photos n'auraient pas été chargées
                }
              }
            }
          }
        }.bind(this, i));
      }
      else {
        photosSrc.singleProduct[i]= no_image;
        if (i >= formValue.singleProduct.length - 1) {
          for (var ii=0; ii<formValue.compositeProduct.length; ii++) {
            if (formValue.compositeProduct[ii].photo!="" && formValue.compositeProduct[ii].photo!=undefined) {
              this.storage.ref(formValue.compositeProduct[ii].photo).getDownloadURL().subscribe(function(ii, data) {
                console.log("compositeProduct data :", data, " / ii : ", ii);
                this.toDataUrl(data, function(data) {
                  photosSrc.compositeProduct[ii]= data;
                });
                if (ii >= formValue.compositeProduct.length - 1) {
                  this.pdfType === PdfType.deliveryReceipt ?  setTimeout(()=>{this.generateDeliveryReceiptPdf(formValue, photosSrc)}, 1000) : setTimeout(()=>{this.generateOrderOrQuotationPdf(formValue, photosSrc)}, 1000); // mis dans un timeout au cas où les autres photos n'auraient pas été chargées
                }
              }.bind(this, ii));
            }
            else {
              photosSrc.compositeProduct[ii]= no_image;
              if (ii >= formValue.compositeProduct.length - 1) {
                this.pdfType === PdfType.deliveryReceipt ? setTimeout(()=>{this.generateDeliveryReceiptPdf(formValue, photosSrc)}, 1000) : setTimeout(()=>{this.generateOrderOrQuotationPdf(formValue, photosSrc)}, 1000); // mis dans un timeout au cas où les autres photos n'auraient pas été chargées
              }
            }
          }
        }
      }
    }
  }

  toDataUrl(file, callback) { // encode en base64 un fichier, utilisé pour encoder les photos de produits en base64
    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function() {
      var reader = new FileReader();
      reader.onloadend = function() {
        callback(reader.result);
      };
      reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', file);
    xhr.send();
  }

  generateDeliveryReceiptPdf(formValue, photosSrc) {
    console.log("generateDeliveryReceiptPdf : ", formValue, " / photosSrc :", photosSrc);

    var infos : string = formValue.deliveryComment;
    var labelsAndData = {
      label: {
        docLabel:'BON DE LIVRAISON',
        numeroLabel:'Référence facture n°: DE-',
        dateLabel:'Date bon de livraison : ',
      },
      data : {
        date: formValue.orderDate.toLocaleDateString("fr-FR"),
        title:'Bon de livraison',
        fileName:'bon-livraison'
      }
    };

    var tableBodyContent =[['Photo produit', 'Nom produit', 'Quantité', 'Immobilisation']];

    // PRODUITS SIMPLES
    for (var i = 0; i < formValue.singleProduct.length; i++) {
      var tableBodyContentSingleProductRow= [];
      var immobilisation='';
      let image = {image : photosSrc.singleProduct[i],
        width: 50};
      if (formValue.singleProduct[i].type === "rental" && formValue.immoDateFrom!==undefined && formValue.immoDateFrom!=='' && formValue.immoDateFrom!=null && formValue.immoDateTo!==undefined && formValue.immoDateTo!=='' && formValue.immoDateTo!=null) {
          immobilisation = 'Du '+formValue.immoDateFrom.toLocaleDateString('fr-FR')+ ' au '+formValue.immoDateTo.toLocaleDateString('fr-FR');
      }
      image !=undefined ? tableBodyContentSingleProductRow.push(image): tableBodyContentSingleProductRow.push('');
      formValue.singleProduct[i].name != undefined ? tableBodyContentSingleProductRow.push(formValue.singleProduct[i].name) : tableBodyContentSingleProductRow.push('');
      formValue.singleProductAmount[i] != undefined ? tableBodyContentSingleProductRow.push(formValue.singleProductAmount[i]) : tableBodyContentSingleProductRow.push('');
      tableBodyContentSingleProductRow.push(immobilisation);
      tableBodyContent.push(tableBodyContentSingleProductRow);
    }

    // PRODUITS COMPOSES
    for (var i = 0; i < formValue.compositeProduct.length; i++) {
      var tableBodyContentCompositeProductRow = [];
      var immobilisation='';
      let image = {
        image: photosSrc.compositeProduct[i],
        width: 50
      };
      if (formValue.compositeProduct[i].type === "rental" && formValue.immoDateFrom!==undefined && formValue.immoDateFrom!=='' && formValue.immoDateFrom!=null && formValue.immoDateTo!==undefined && formValue.immoDateTo!=='' && formValue.immoDateTo!=null) {
        immobilisation = 'Du '+formValue.immoDateFrom.toLocaleDateString('fr-FR')+ ' au '+formValue.immoDateTo.toLocaleDateString('fr-FR');
      }
      image != undefined ? tableBodyContentCompositeProductRow.push(image) : tableBodyContentCompositeProductRow.push('');
      formValue.compositeProduct[i].name != undefined ? tableBodyContentCompositeProductRow.push(formValue.compositeProduct[i].name) : tableBodyContentCompositeProductRow.push('');
      formValue.compositeProductAmount != undefined ? tableBodyContentCompositeProductRow.push(formValue.compositeProductAmount) : tableBodyContentCompositeProductRow.push('');
      tableBodyContentCompositeProductRow.push(immobilisation);
      tableBodyContent.push(tableBodyContentCompositeProductRow);
    }

    var docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [ 25, 100, 25, 75 ],

      info: {
        title: labelsAndData.data.title+'-'+this.id,
        author: 'BORNE-CONCEPT',
      },
      header:     [
        { columns: [
          { width: 75,
            image: photosSrc.logo
          },
          { width: '*',
            text: labelsAndData.label.docLabel,
            alignment : 'center',
            margin: [0,20,0,0]
          },
        ],
          margin: [20, 15]
        },
      ],
      footer: [
        {
          stack: [
            'Borne Concept',
            '11 rue des Perdrix',
            '94520 Mandres Les Roses',
            'tel 01 45 95 07 53'
          ],
          fontSize: 12,
          bold: true,
          alignment: 'center'
        }
      ],
      content: [
        { columns: [
          {
            width: '50%',
            text: labelsAndData.label.numeroLabel + this.id,
          },
          {
            width: '*',
            text: labelsAndData.label.dateLabel + labelsAndData.data.date,
            alignment : 'right'
          },
        ],
          margin: [0,0,0,20]
        },

        {
          stack : [
            'Client : ' + formValue.client.name,
            'Nom du contact : ' + formValue.contact.contactName,
            'Email du contact : ' + formValue.contact.contactEmail,
            'Adresse : ' + formValue.client.address + ', ' + + formValue.client.zipcode + ' ' + formValue.client.town,
          ],
          margin: [0,0,0,20]
        },
        {table: {
          headerRows: 1,
          widths: [ '25%', '40%', '10%', '25%'],
          body: tableBodyContent
        },
          margin: [0,0,0,20],
          alignment: 'center',
        },
        {
          stack : [
            '...',
            '...'],
          margin: [0,0,0,20]
        },
        {
          text : 'Information : '+infos,
          margin: [0,0,0,20]
        },
      ]
    };
    console.log("docDefinition", docDefinition);
    pdfMake.createPdf(docDefinition).download(labelsAndData.data.fileName+'-'+this.id);
  }

  generateOrderOrQuotationPdf(formValue, photosSrc) {
    console.log("generateOrderOrQuotationPdf : ", formValue, " / photosSrc :", photosSrc);
    this.computePrices(formValue);
    var labelsAndData = {
      label : {
      docLabel:'',
      numeroLabel:'',
      dateLabel:'',
    },
      data : {
        date:'',
        title:'',
        fileName:'',
    }
    };
    var infos : string;
    var stack: Array<string> = [];
    switch (this.pdfType) {
      case PdfType.advanceInvoice:
        labelsAndData = {
          label: {
            docLabel:'FACTURE D\'ACOMPTE',
            numeroLabel:'Facture n° : FA-',
            dateLabel:'Date facture : ',
          },
          data : {
            date: formValue.advanceInvoiceDate.toLocaleDateString("fr-FR"),
            title:'facture-acompte',
            fileName:'facture-acompte',
          }
        };
        stack = [
            'Paiement par chèque à l\'ordre de « BORNE-CONCPET » ou virement bancaire sur compte suivant :',
            'Banque : xxx',
            'Domiciliation :  xxx',
            'RIB : 	xxx',
            'IBAN : xxx',
            'BIC : xxx'
          ];
        infos = formValue.orderComment;

        break;
      case PdfType.balanceInvoice:
        labelsAndData = {
          label : {
            docLabel:'FACTURE DE SOLDE',
            numeroLabel:'Facture n° : FS-',
            dateLabel:'Date facture : ',
          },
          data : {
            date: formValue.balanceInvoiceDate.toLocaleDateString("fr-FR"),
            title:'facture-solde',
            fileName:'facture-solde',
          }

        };
        stack = [
          'Paiement par chèque à l\'ordre de « BORNE-CONCPET » ou virement bancaire sur compte suivant :',
          'Banque : xxx',
          'Domiciliation :  xxx',
          'RIB : 	xxx',
          'IBAN : xxx',
          'BIC : xxx'
        ];
        infos = formValue.orderComment;
        break;
      case PdfType.quotation:
        labelsAndData = {
          label: {
            docLabel:'DEVIS',
            numeroLabel:'Devis n°: DE-',
            dateLabel:'Date devis : ',
          },
          data : {
            date: formValue.quotationDate.toLocaleDateString("fr-FR"),
            title:'devis',
            fileName:'devis'
          }
        };
        stack = [
            'Pour toute commande',
            '...'
          ];
        infos = formValue.quotationComment;
        break;
    }

    var tableBodyContent =[['Photo produit', 'Nom produit', 'description', 'Quantité', 'durée location', 'Prix unitaire', 'Prix total']];

    // PRODUITS SIMPLES
        for (var i = 0; i < formValue.singleProduct.length; i++) {
          if (formValue.singleProduct[i]!='') {
            var tableBodyContentSingleProductRow= [];
            let price;
            var numberOfRentDays;
            var degressivity;
            let image = {image : photosSrc.singleProduct[i],
              width: 50};
            if (formValue.singleProduct[i].type === "sale" || formValue.singleProduct[i].type === "service" ) {
              price = formValue.singleProduct[i].sell_price;
              numberOfRentDays = '-';
              degressivity = 1;
            }
            else {
              price = formValue.singleProduct[i].rent_price;
              numberOfRentDays = formValue.numberOfRentDays;
              if (numberOfRentDays>=1) {
                formValue.singleProduct[i].apply_degressivity=="true" ? degressivity = 1+(numberOfRentDays-1)/10 : degressivity = numberOfRentDays;
              }
              else {
                formValue.singleProduct[i].apply_degressivity=="true" ? degressivity = 0: degressivity = 0;
              }
            }
            image !=undefined ? tableBodyContentSingleProductRow.push(image): tableBodyContentSingleProductRow.push('');
            formValue.singleProduct[i].name != undefined ? tableBodyContentSingleProductRow.push(formValue.singleProduct[i].name) : tableBodyContentSingleProductRow.push('');
            formValue.singleProduct[i].description != undefined ? tableBodyContentSingleProductRow.push(formValue.singleProduct[i].description) : tableBodyContentSingleProductRow.push('');
            formValue.singleProductAmount[i] != undefined ? tableBodyContentSingleProductRow.push(formValue.singleProductAmount[i]) : tableBodyContentSingleProductRow.push('');
            numberOfRentDays != undefined ? tableBodyContentSingleProductRow.push(numberOfRentDays+' j') : tableBodyContentSingleProductRow.push('');
            price != undefined ? tableBodyContentSingleProductRow.push(price+'€ HT'): tableBodyContentSingleProductRow.push('');
            (price != undefined && formValue.singleProductAmount[i] != undefined && degressivity!=undefined) ? tableBodyContentSingleProductRow.push(price*formValue.singleProductAmount[i]*degressivity+' €HT') : tableBodyContentSingleProductRow.push('');
            tableBodyContent.push(tableBodyContentSingleProductRow);
          }
      }

    // PRODUITS COMPOSES
    if (formValue.compositeProduct[0]!='') {
      var tableBodyContentCompositeProductRow = [];
      let image = {
        image: photosSrc.compositeProduct[0],
        width: 50
      };
      let price = this.getCompositeProductsPrice(formValue);
      var numberOfRentDays;
      var degressivity;
      if (formValue.compositeProduct[0].type === "sale" || formValue.compositeProduct[0].type === "service") {
        numberOfRentDays = '-';
        degressivity = 1;
      }
      else {
        numberOfRentDays = formValue.numberOfRentDays;
        if (numberOfRentDays>=1) {
          formValue.compositeProduct[0].apply_degressivity == "true" ? degressivity = 1 + (numberOfRentDays-1) / 10 : degressivity = numberOfRentDays;
        }
        else {formValue.compositeProduct[0].apply_degressivity == "true" ? degressivity = 0 : degressivity = 0;}
      }

      image != undefined ? tableBodyContentCompositeProductRow.push(image) : tableBodyContentCompositeProductRow.push('');
      formValue.compositeProduct[0].name != undefined ? tableBodyContentCompositeProductRow.push(formValue.compositeProduct[0].name) : tableBodyContentCompositeProductRow.push('');
      formValue.compositeProduct[0].description != undefined ? tableBodyContentCompositeProductRow.push(formValue.compositeProduct[0].description) : tableBodyContentCompositeProductRow.push('');
      formValue.compositeProductAmount != undefined ? tableBodyContentCompositeProductRow.push(formValue.compositeProductAmount) : tableBodyContentCompositeProductRow.push('');
      numberOfRentDays != undefined ? tableBodyContentCompositeProductRow.push(numberOfRentDays + ' j') : tableBodyContentCompositeProductRow.push('');
      price != undefined ? tableBodyContentCompositeProductRow.push(price + ' €HT') : tableBodyContentCompositeProductRow.push('');
      (price != undefined && formValue.compositeProductAmount != undefined && formValue.numberOfRentDays != undefined && degressivity != undefined) ? tableBodyContentCompositeProductRow.push(price * formValue.compositeProductAmount * degressivity + ' €HT') : tableBodyContentCompositeProductRow.push('');
      tableBodyContent.push(tableBodyContentCompositeProductRow);
    }

    // PRIX
    tableBodyContent.push(['Total HT','', '','', '', '', formValue.price+' €HT']);
    formValue.discount>0 ?   tableBodyContent.push(['Remise en %','', '', '', '', '', formValue.discount+'%']) : console.log("pas de remise affichée");
    formValue.discount>0 ?  tableBodyContent.push(['Total HT remisé','', '','', '', '', formValue.discountPrice+' €HT']): console.log("pas de remise affichée");
    tableBodyContent.push(['Total TTC','', '','', '', '(TVA 20%)', formValue.discountPrice*1.20+' €TTC']);// todo récupérer TVA depuis la BD
    switch (this.pdfType) {
      case PdfType.advanceInvoice:
        tableBodyContent.push(['Total à payer','', '', '', '', '(acompte '+formValue.advanceRate+'%)', Math.round(formValue.discountPrice * 1.20 / 100 * formValue.advanceRate) + ' €TTC']);
        break;
      case PdfType.balanceInvoice:
        tableBodyContent.push(['Reste à payer','', '', '', '', '(acompte '+formValue.advanceRate+'% déduit)', formValue.discountPrice - Math.round(formValue.discountPrice * 1.20 / 100*formValue.advanceRate) + ' €TTC']);
        break;
    }

    var docDefinition = {
      // a string or { width: number, height: number }
      pageSize: 'A4',

      // by default we use portrait, you can change it to landscape if you wish
      pageOrientation: 'portrait',

      // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
      pageMargins: [ 25, 100, 25, 75 ],

      info: {
        title: labelsAndData.data.title+'-'+this.id,
        author: 'BORNE-CONCEPT',
      },

      header:     [

        { columns: [
          { width: 75,
            image: photosSrc.logo
          },
          { width: '*',
            text: labelsAndData.label.docLabel,
            alignment : 'center',
            margin: [0,20,0,0]
          },
          ],
          margin: [20, 15]
        },
      ],

      footer: [
        {
          stack: [
            'Borne Concept',
            '11 rue des Perdrix',
            '94520 Mandres Les Roses',
            'tel 01 45 95 07 53'
          ],
          fontSize: 12,
          bold: true,
          alignment: 'center'
        }
      ],

      content: [

        { columns: [
            {
              width: '50%',
              text: labelsAndData.label.numeroLabel + this.id,
            },
            {
              width: '*',
              text: labelsAndData.label.dateLabel + labelsAndData.data.date,
              alignment : 'right'
            },
          ],
          margin: [0,0,0,20]
        },

        {
          stack : [
            'Client : ' + formValue.client.name,
            'Nom du contact : ' + formValue.contact.contactName,
            'Email du contact : ' + formValue.contact.contactEmail,
            'Adresse : ' + formValue.client.address + ', ' + + formValue.client.zipcode + ' ' + formValue.client.town,
          ],
          margin: [0,0,0,20]
        },

        {table: {
          // headers are automatically repeated if the table spans over multiple pages
          // you can declare how many rows should be treated as headers
          headerRows: 1,
          widths: [ '20%', '10%','20%', '10%', '10%', '15%', '15%' ],
          body: tableBodyContent
          },
          margin: [0,0,0,20],
          alignment: 'center',
        },
        {
          stack : stack,
          margin: [0,0,0,20]
        },
        {
          text : 'Information : '+infos,
          margin: [0,0,0,20]
        },
      ],
      styles: {
        stylePersoExample: {
          fontSize: 22,
          bold: true
        },
        anotherStyleExample: {
          italic: true,
          alignment: 'right'
        }
      }
    };
      console.log("docDefinition", docDefinition);
      pdfMake.createPdf(docDefinition).download(labelsAndData.data.fileName+'-'+this.id);

  }

  // todo appler ces méthodes par le service compute-price
  computePrices(formValue) {
    const numberOfRentDays = this.getNumberOfRentDaysComputed(formValue.rentDateFrom, formValue.rentDateTo);
    const price = this.getTotalProductsPrice(numberOfRentDays, formValue);
    const discount = Number(formValue.client.discount);
    formValue.price = price;
    formValue.discount= discount;
    formValue.discountPrice = price - price*discount/100;
    formValue.numberOfRentDays= numberOfRentDays;
    console.log("formValue.price : ", formValue.price);
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

  getTotalProductsPrice(numberOfRentDays:number, formValue) {
    var price:number = 0;
    if (numberOfRentDays>=1) {
      for (var i = 0; i < formValue.singleProduct.length; i++) {
        if (formValue.singleProduct[i] != "") {
          if (formValue.singleProduct[i].type === "sale" || formValue.singleProduct[i].type === "service") {
            console.log("getSingleProductsPrice type === sale or service", Number(formValue.singleProduct[i].sell_price * formValue.singleProductAmount[i]));
            price += Number(formValue.singleProduct[i].sell_price * formValue.singleProductAmount[i]);
          }
          else {
            var degressivity;
            formValue.singleProduct[i].apply_degressivity == "true" ? degressivity = 1 + (numberOfRentDays - 1) / 10 : degressivity = numberOfRentDays;
            console.log("getSingleProductsPrice type === rental", Number(formValue.singleProduct[i].rent_price) * formValue.singleProductAmount[i] * degressivity);
            price += Number(formValue.singleProduct[i].rent_price) * formValue.singleProductAmount[i] * degressivity;
          }
        }
      }

      console.log("price : ", price);

      for (var i = 0; i < formValue.compositeProduct.length; i++) {
        if (formValue.compositeProduct[i] != "") {
          if (formValue.compositeProduct[i].type === "sale" || formValue.compositeProduct[i].type === "service") {
            console.log("getCompositeProductsPrice type === sale or service", Number(formValue.compositeProduct[i].sell_price * formValue.compositeProductAmount));
            price += Number(formValue.compositeProduct[i].sell_price * formValue.compositeProductAmount);
          }
          else {
            var degressivity;
            formValue.compositeProduct[i].apply_degressivity == "true" ? degressivity = 1 + (numberOfRentDays - 1) / 10 : degressivity = numberOfRentDays;
            console.log("getCompositeProductsPrice type === rental", Number(formValue.compositeProduct[i].rent_price) * formValue.compositeProductAmount * degressivity);
            price += Number(formValue.compositeProduct[i].rent_price) * formValue.compositeProductAmount * degressivity;
          }
        }
      }
    }
    console.log("price : ", price);
    return price
  }

  getCompositeProductsPrice(formValue) {
    var price:number = 0;
      for (var i=0; i<formValue.compositeProduct.length; i++) {
      if (formValue.compositeProduct[i]!="") {
        if (formValue.compositeProduct[i].type === "sale" || formValue.compositeProduct[i].type === "service") {
          console.log("getCompositeProductsPrice type === sale or service", Number(formValue.compositeProduct[i].sell_price));
          price+=Number(formValue.compositeProduct[i].sell_price);
        }
        else {
          console.log("getCompositeProductsPrice type === rental", Number(formValue.compositeProduct[i].rent_price));
          price+=Number(formValue.compositeProduct[i].rent_price);
        }
      }
    }
    console.log("getCompositeProductsPrice : ", price);
    return price
  }
}


/*
 let header = '<head><meta charset="utf-8"><title>BcErp</title></head>' +
 '<body><img src="' + photosSrc.logo + '" width="50px" height="auto"/>' +
 '<div>FACTURE D\'ACOMPTE</div>';

 let footer = '<div>BORNE-CONCEPT</div>' +
 '<div>11 Rue des Perdrix, 94520 Mandres-les-Roses</div>' +
 '<div>Téléphone : +33 6 80 57 06 07 / + 33 1 45 95 07 53</div>' +
 '</body>';

 var tableSingleProductTr = '<style>' +
 '.spanAsTd {display:inline-block; padding: 5mm; color:red; width: 40mm;}' +
 '.inline-block {display:inline-block; width : 50mm; height: auto}' +
 '</style>';

 for (var i = 0; i < formValue.singleProduct.length; i++) {
 let price;
 (formValue.singleProduct[i].type === "sale" || formValue.singleProduct[i].type === "service") ? price = formValue.singleProduct[i].sell_price : price = formValue.singleProduct[i].rent_price;
 tableSingleProductTr = tableSingleProductTr + '<tr>' +
 '<span class="spanAsTd"><img style="float: left" class="inline-block" src="' + photosSrc.singleProduct[i] + '" width="50px" height="auto"/></span>' +
 '<span class="spanAsTd">' + formValue.singleProduct[i].name + '</span>' +
 '<span class="spanAsTd">' + formValue.singleProductAmount[i] + '</span>' +
 '<span class="spanAsTd">' + price + '</span>' +
 '<span class="spanAsTd">' + price * formValue.singleProductAmount[i] + '</span>' +
 '</tr>'
 }


 let body = '<div id="specialElementHandlers"></div>' +
 '<div><div><tr><span class="spanAsTd">Photo produit</span><span class="spanAsTd">Nom produit</span><span class="spanAsTd">Quantité</span><span class="spanAsTd">Prix unitaire</span><span class="spanAsTd">Prix total</span></tr></div><div>' +
 tableSingleProductTr +
 '</div></div>';

 let content = header + body + footer;
 */
/*
 let doc = new jsPDF();
 let specialElementHandlers = {
 '#specialElementHandlers': function (element, renderer) {
 return true;
 }
 };
 doc.fromHTML(content, 15, 15, {'width': 190, 'elementHandlers': specialElementHandlers},
 function(data){
 //console.log("data", data);
 console.log("content", content);
 doc.save('facture_accompte.pdf');});
 */
/*

 var opt = {
 margin:       1,
 filename:     'facture_accompte.pdf',
 image:        { type: 'jpeg', quality: 0.98 },
 html2canvas:  { scale: 1 },
 jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
 };

 // New Promise-based usage:
 html2pdf().set(opt).from(content).save();
 */
/*
 const filename  = 'facture_accompt.pdf';

 let pdfContent = document.querySelector('#pdfContent');
 pdfContent.innerHTML = content;
 html2canvas(pdfContent).then(canvas => {
 let pdf = new jsPDF('p', 'mm', 'a4');
 pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 211, 298);
 pdf.save(filename);
 });
 */
//let doc = new jsPDF();
