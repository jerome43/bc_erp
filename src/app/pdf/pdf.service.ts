import { Injectable } from '@angular/core';
import {Order} from "../order/Order"
import { AngularFireStorage } from '@angular/fire/storage';
import * as pdfMake from 'pdfmake/build/pdfmake.js';
//import * as pdfFonts from 'pdfmake/build/vfs_fonts.js';
import * as pdfFonts from '../../assets/fonts/vfs_fonts.js';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
import {PdfType} from './pdf-type';
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
import {ComputePriceService} from "../price/compute-price.service";
import { staticsPhotos } from "../../assets/img/statics-photos";

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  private id:string; // l'id du devis ou de la facture stockés dans firebase

  private pdfType:PdfType; // le type de pdf à générer

  constructor(private storage: AngularFireStorage, private computePriceService: ComputePriceService) {
  }

  wantGeneratePdf(formValue, id, pdfType: PdfType) {
    console.log("wantGenerateAdvanceInvoicePdf : ", formValue, ' / ', id);
    this.id = id;
    this.pdfType = pdfType;
    (this.pdfType === PdfType.deliveryReceipt || this.pdfType === PdfType.preparationReceipt) ? this.generateDeliveryReceiptPdf(formValue) : this.generateOrderOrQuotationPdf(formValue);
  }


  generateDeliveryReceiptPdf(formValue) { // génération du bon de livraison
    console.log("generateDeliveryReceiptPdf : ", formValue);
    var conditionsStack: Array<any> = []; // les infos de conditions générales, paiement ...

    var metaDatas = {
      date:'',
      title:'',
      fileName:'',
    };

    switch (this.pdfType) {
      case PdfType.deliveryReceipt:
        metaDatas = {
          date: formValue.orderDate.toLocaleDateString("fr-FR"),
          title:'Bon de livraison commande n° ',
          fileName:'bon-livraison'
        };
        conditionsStack = [
          formValue.deliveryComment,
          'La société Borne Concept met à présent tout en œuvre pour la réussite de votre manifestation en vous accompagnant en amont de votre événement dans la préparation, la configuration, la livraison, l\'installation, la hot line, l\'intervention sur site et la reprise en fin d\'événement.',
        ];
        break;

      case PdfType.preparationReceipt:
        metaDatas = {
          date: formValue.orderDate.toLocaleDateString("fr-FR"),
          title:'Bon de préparation commande n° ',
          fileName:'bon-preparation'
        };
        conditionsStack = [
          formValue.deliveryComment,
          formValue.privateQuotationComment,
         ];
    }

    var clientStack = [ // les infos clients en en-tête (nom, adresse, contac../
      'Entreprise ' + formValue.client.name,
      formValue.contact.contactName,
      formValue.contact.contactEmail,
      formValue.contact.contactCellPhone,
      formValue.contact.contactPhone,
    ];

    var deliveryPreparationStack = [ // les infos n° devis, dates location...
      {text : metaDatas.title + this.id,
        bold: true},
      'Contact sur place: '+ formValue.installationContact,
      'Adresse de livraison : ' + formValue.installationAddress,
      'Date de livraison : ' + this.tolocaleDateString(formValue.installationDate),
      'Heure de livraison : ' + formValue.installationHours,
    ];

    // tableau des produits
    var tableProducts : Array<any>;
    var isSaleDeliveryReceipt:boolean = false; // pour savoir si on génère un bon de préparation / livraison en vue d'une vente ou d'une location

    if (formValue.singleProduct.find(e=>e.type==="sale")=== undefined  && formValue.compositeProduct.find(e=>e.type==="sale")=== undefined ) { // si aucun élément de type vente est trouvé, on génère un bon de livraion / préparation en vue d'une location
      this.pdfType===PdfType.deliveryReceipt ? tableProducts =[['','Quantité', 'dates location']] : tableProducts =[['','Quantité', 'dates location', 'dates immobilisation']];
    }
    else { // sinon o, génère un bon de livraion / préparation en vue d'une vente
      tableProducts =[['','Quantité']];
      isSaleDeliveryReceipt = true;
    }
    console.log("isSaleDeliveryReceipt", isSaleDeliveryReceipt);

    // PRODUITS SIMPLES
    for (var i = 0; i < formValue.singleProduct.length; i++) {
      if (formValue.singleProduct[i].type !== "service" ) { // on ne fait pas apparaître les prestations de service dans les bons de prépararion ou de livraions
        let singleProductRow= [], immobilisation='', location='', numberOfRentDays= 1, productInfos = {stack: []};
        if (formValue.singleProduct[i].type === "rental" ) { numberOfRentDays = formValue.numberOfRentDays;}
        formValue.singleProduct[i].name != undefined ? productInfos.stack.push({text:formValue.singleProduct[i].name, bold:true}) : productInfos.stack.push('');
        formValue.singleProduct[i].description != undefined ? productInfos.stack.push({text:formValue.singleProduct[i].description, italics:true}) : productInfos.stack.push('');
        numberOfRentDays != undefined && formValue.singleProduct[i].type==="rental" ? productInfos.stack.push('Location '+ numberOfRentDays+' j') : productInfos.stack.push('');
        singleProductRow.push(productInfos);
        (formValue.singleProductAmount[i] != undefined && formValue.singleProduct[i].name !=undefined && formValue.singleProduct[i].name !='') ? singleProductRow.push(formValue.singleProductAmount[i]) : singleProductRow.push('');
        if (formValue.singleProduct[i].type ==="rental" && formValue.rentDateFrom!==undefined && formValue.rentDateFrom!=='' && formValue.rentDateFrom!=null && formValue.rentDateTo!==undefined && formValue.rentDateTo!=='' && formValue.rentDateTo!=null) {
          location = 'Du '+formValue.rentDateFrom.toLocaleDateString('fr-FR')+ ' au '+formValue.rentDateTo.toLocaleDateString('fr-FR');
        }
        if (formValue.singleProduct[i].type ==="rental" && formValue.immoDateFrom!==undefined && formValue.immoDateFrom!=='' && formValue.immoDateFrom!=null && formValue.immoDateTo!==undefined && formValue.immoDateTo!=='' && formValue.immoDateTo!=null) {
          immobilisation = 'Du '+formValue.immoDateFrom.toLocaleDateString('fr-FR')+ ' au '+formValue.immoDateTo.toLocaleDateString('fr-FR');
        }
        if (!isSaleDeliveryReceipt) {this.pdfType===PdfType.deliveryReceipt ? singleProductRow.push(location) : singleProductRow.push(location, immobilisation);}
        tableProducts.push(singleProductRow);
      }
    }

    // PRODUITS COMPOSES
    for (var i = 0; i < formValue.compositeProduct.length; i++) {
      if (formValue.compositeProduct[i].type !== "service") {// on ne fait pas apparaître les prestations de service dans les bons de prépararion ou de livraions
        let compositeProductRow= [], immobilisation='', location='', numberOfRentDays= 1, productInfos = {stack: []};
        if (formValue.compositeProduct[i].type === "rental" ) { numberOfRentDays = formValue.numberOfRentDays;}
        formValue.compositeProduct[i].name != undefined ? productInfos.stack.push({text:formValue.compositeProduct[i].name, bold:true}) : productInfos.stack.push('');
        formValue.compositeProduct[i].description != undefined ? productInfos.stack.push({text:formValue.compositeProduct[i].description, italics:true}) : productInfos.stack.push('');
        numberOfRentDays != undefined && formValue.compositeProduct[i].type === "rental" ? productInfos.stack.push('Location '+ numberOfRentDays+' j') : productInfos.stack.push('');
        compositeProductRow.push(productInfos);
        (formValue.compositeProductAmount != undefined && formValue.compositeProduct[i].name !=undefined && formValue.compositeProduct[i].name !='')? compositeProductRow.push(formValue.compositeProductAmount) : compositeProductRow.push('');
        if (formValue.compositeProduct[i].type ==="rental" && formValue.rentDateFrom!==undefined && formValue.rentDateFrom!=='' && formValue.rentDateFrom!=null && formValue.rentDateTo!==undefined && formValue.rentDateTo!=='' && formValue.rentDateTo!=null) {
          location = 'Du '+formValue.rentDateFrom.toLocaleDateString('fr-FR')+ ' au '+formValue.rentDateTo.toLocaleDateString('fr-FR');
        }
        if (formValue.compositeProduct[i].type ==="rental" && formValue.immoDateFrom!==undefined && formValue.immoDateFrom!=='' && formValue.immoDateFrom!=null && formValue.immoDateTo!==undefined && formValue.immoDateTo!=='' && formValue.immoDateTo!=null) {
          immobilisation = 'Du '+formValue.immoDateFrom.toLocaleDateString('fr-FR')+ ' au '+formValue.immoDateTo.toLocaleDateString('fr-FR');
        }
        if (!isSaleDeliveryReceipt) {this.pdfType===PdfType.deliveryReceipt ? compositeProductRow.push(location) : compositeProductRow.push(location, immobilisation);}
        tableProducts.push(compositeProductRow);
      }

    }

    var docDefinition = {
      // a string or { width: number, height: number }
      pageSize: 'A4',

      // by default we use portrait, you can change it to landscape if you wish
      pageOrientation: 'portrait',

      // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
      // margins are set in point that is 1/2.54*72 cm, soit env 28.35 équivaut à 1cm
      pageMargins: [ 56, 85, 56, 85],

      info: {
        title: metaDatas.title+'-'+formValue.client.name+'-'+this.id,
        author: 'BORNE-CONCEPT',
      },

      header:     [
        {
          image: staticsPhotos.logo,
          width: 150,
          alignment : 'center',
          margin: [0, 14, 0, 0]
        },
      ],

      footer: [
        {
          text: "www.borneconcept.net",
          link: "http://www.borneconcept.net/",
          color: "#F77700",
          fontSize: 8,
          alignment: "center",
          margin: [0,0,0,8]
        },
        {
          columns: [
            {
              stack: [
                '11 rue des Perdrix, 94520 Mandres Les Roses',
                '+33 (0)l 45 95 07 53',
                'IBAN : FR76 18206000584212279000148',
                'Code BIC : AGRIFRPP882'
              ]
            },
            {
              stack: [
                'RCS Créteil : 492 764 543',
                'SAS au capital de 15 000 €',
                'Siret : 49276454300038',
                'N° TVAI : FR 61 492764543'
              ]
            },

          ],
          fontSize: 8,
          alignment: 'center',
          margin: [85, 0, 85, 56]
        }
      ],

      content: [
        {
          stack : clientStack,
          margin: [320,0,0,0]
        },
        { columns: [
          [
            {stack : deliveryPreparationStack},
          ],
          {
            width: '*',
            text: 'Paris, le ' + metaDatas.date,
            margin : [0,14,0,0]
          },
        ],
          margin: [0,0,0,28]
        },

        {table: {
          // headers are automatically repeated if the table spans over multiple pages
          // you can declare how many rows should be treated as headers
          headerRows: 1,
          widths: ['50%','10%', '20%', '20%'],
          body: tableProducts
        },
          layout: 'noBorders',
          margin: [0,0,0,14],
          alignment: 'left',
        },
        {
          stack : conditionsStack,
          margin: [0,0,0,14]
        }
      ],
      defaultStyle: {
        //font: 'panton',
        font: 'Roboto',
        fontSize: 10,
        alignment: 'left'
      },
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
    pdfMake.createPdf(docDefinition).download(metaDatas.fileName+'-'+formValue.client.name+'-'+this.id);
  }

  generateOrderOrQuotationPdf(formValue) { // génération du devis ou de la facture
    console.log("generateOrderOrQuotationPdf : ", formValue);
    this.computePrices(formValue);
    var metaDatas = {
        date:'',
        title:'',
        fileName:'',
    };
    var clientStack: Array<any> = []; // les infos clients en en-tête (nom, adresse, contac../
    var orderQuotationStack: Array<any> = []; // les infos n° devis, dates location...
    var conditionsStack: Array<any> = []; // les infos de conditions générales, paiement ...

    switch (this.pdfType) {
      case PdfType.advanceInvoice:
        metaDatas = {
            date: formValue.orderDate.toLocaleDateString("fr-FR"),
            title:'facture-acompte',
            fileName:'facture-acompte',
        };

        clientStack = [
            'Entreprise ' + formValue.client.name,
            'Service compatbilité',
            formValue.client.address,
            formValue.client.zipcode + ' ' + formValue.client.town,
        ];

        orderQuotationStack = [
          {text: 'Facture n° ' + formValue.numerosInvoice.advance, bold: true, fontSize: 16},
          'Commande n° ' + this.id,

        ];
        conditionsStack = [
          formValue.orderComment,
            {stack : [
              'Règlement par chèque à l\'ordre de Borne Concept ou par virement : ',
              'Banque : xxx',
              'Domiciliation :  xxx',
              'RIB : 	xxx',
              'IBAN : FR76 18206000584212279000148',
              'CODE BIC : AGRIFRPP882'],
              margin: [0, 28,]

            },
          {stack : [
            {text : 'Conditions de règlement : ',  decoration: 'underline'},
            'Règlement dès réception de la facture.',
            'En cas de retard de paiement, seront exigibles, conformément à l\'article L 441-6 du code du commerce',
            'une indemnité calculée sur la base de trois fois le taux de l\'intérêt légal en vigueur',
            'ainsi qu\'une indemnité forfaitaire pour frais de recouvrement de 40 €',
            ]
          }
          ];
        break;

      case PdfType.balanceInvoice:
        metaDatas = {
            date: formValue.balanceInvoiceDate.toLocaleDateString("fr-FR"),
            title:'facture-solde',
            fileName:'facture-solde',
        };
        clientStack = [
          'Entreprise ' + formValue.client.name,
          'Service compatbilité',
          formValue.client.address,
          formValue.client.zipcode + ' ' + formValue.client.town,
        ];

        orderQuotationStack = [
          {text : 'Facture n° ' + formValue.numerosInvoice.balance, bold: true},
          'Commande n° ' + this.id,
        ];
        conditionsStack = [
          formValue.orderComment,
          {stack : [
            'Règlement par chèque à l\'ordre de Borne Concept ou par virement : ',
            'Banque : xxx',
            'Domiciliation :  xxx',
            'RIB : 	xxx',
            'IBAN : FR76 18206000584212279000148',
            'CODE BIC : AGRIFRPP882'],
            margin: [0, 14,]

          },
          {stack : [
            {text : 'Conditions de règlement : ',  decoration: 'underline'},
            'Règlement dès réception de la facture.',
            'En cas de retard de paiement, seront exigibles, conformément à l\'article L 441-6 du code du commerce',
            'une indemnité calculée sur la base de trois fois le taux de l\'intérêt légal en vigueur',
            'ainsi qu\'une indemnité forfaitaire pour frais de recouvrement de 40 €',
          ]
          }
        ];
        break;

      case PdfType.quotation:
        metaDatas = {
            date: formValue.quotationDate.toLocaleDateString("fr-FR"),
            title:'devis',
            fileName:'devis'
        };
        clientStack = [
          'Entreprise ' + formValue.client.name,
          formValue.contact.contactName,
          formValue.contact.contactEmail,
          formValue.contact.contactCellPhone,
          formValue.contact.contactPhone,
        ];

        orderQuotationStack = [
          {text : 'Devis n° ' + this.id,
            bold: true},
          'Contact : '+ formValue.employe.name + ' ' + formValue.employe.cellPhone,
          formValue.employe.email
        ];
        conditionsStack = [
          formValue.quotationComment,
          this.getRentDateAndPlace(formValue).livraison,
          'Pour confirmer votre commande, il vous suffit de nous faire parvenir par mail à '+ formValue.employe.email + ' ce devis daté et signé avec le cachet de votre société',
          {	table: {
            widths: [120, 80, '*'],
            heights: [14, 80],
            body: [
              ['Bon pour accord', 'date', 'Cachet de la société'],
              ['signature', '', '']
            ]
          }, margin: [0,14]},
          'La société Borne Concept met à présent tout en œuvre pour la réussite de votre manifestation en vous accompagnant en amont de votre événement dans la préparation, la configuration, la livraison, l\'installation, la hot line, l\'intervention sur site et la reprise en fin d\'événement.',
          {text : 'Conditions générales de vente : ',  decoration: 'underline', margin:[0,12,0,0]},
          'Acompte 40% à la commande, solde dès réception de la facture, validité de l’offre 30 jours',
          'En cas de retard de paiement, seront exigibles, conformément à l\'article L 441-6 du code du commerce',
          'une indemnité calculée sur la base de trois fois le taux de l\'intérêt légal en vigueur',
          'ainsi qu\'une indemnité forfaitaire pour frais de recouvrement de 40 €'
          ];
        break;
    }

    var tableProducts =[['', 'Quantité', 'Prix unitaire', 'Prix HT']];

    // PRODUITS SIMPLES
        for (var i = 0; i < formValue.singleProduct.length; i++) {
          if (formValue.singleProduct[i]!='') {
            var singleProductRow= [];
            let price;
            let numberOfRentDays=1;
            let degressivity=1;
            if (formValue.singleProduct[i].type ==="rental" ) {
              price = formValue.singleProduct[i].rent_price;
              numberOfRentDays = formValue.numberOfRentDays;
              formValue.singleProduct[i].apply_degressivity==="true" ? degressivity = 1+numberOfRentDays/10 : degressivity = numberOfRentDays;
            }
            else {
              price = formValue.singleProduct[i].sell_price;
            }

            let productInfos = {stack: []};
            formValue.singleProduct[i].name != undefined ? productInfos.stack.push({text:formValue.singleProduct[i].name, bold:true}) : productInfos.stack.push('');
            formValue.singleProduct[i].description != undefined ? productInfos.stack.push({text:formValue.singleProduct[i].description, italics:true}) : productInfos.stack.push('');
            numberOfRentDays != undefined && formValue.singleProduct[i].type === "rental" ? productInfos.stack.push('Location '+ numberOfRentDays+' j') : productInfos.stack.push('');
            singleProductRow.push(productInfos);
            formValue.singleProductAmount[i] != undefined ? singleProductRow.push(formValue.singleProductAmount[i]) : singleProductRow.push('');
            price != undefined ? singleProductRow.push(this.formatToTwoDecimal(price)+'€ HT'): singleProductRow.push('');
            if (numberOfRentDays>1) {
              (price != undefined && formValue.singleProductAmount[i] != undefined) ? singleProductRow.push(this.formatToTwoDecimal(price*formValue.singleProductAmount[i]*degressivity)+' €HT') : singleProductRow.push('');
            }
            else {
              (price != undefined && formValue.singleProductAmount[i] != undefined) ? singleProductRow.push(this.formatToTwoDecimal(price*formValue.singleProductAmount[i]*numberOfRentDays)+' €HT') : singleProductRow.push('');
            }
            tableProducts.push(singleProductRow);
          }
      }

    // PRODUITS COMPOSES
    if (formValue.compositeProduct[0]!='') {
      var compositeProductRow = [];
      let price = this.getCompositeProductsPrice(formValue);
      let numberOfRentDays=1;
      let degressivity=1;
      if (formValue.compositeProduct[0].type ==="rental") {
        numberOfRentDays = Number(formValue.numberOfRentDays);
        formValue.compositeProduct[0].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays/10 : degressivity = numberOfRentDays;
      }

      let productInfos = {stack: []};
      formValue.compositeProduct[0].name != undefined ? productInfos.stack.push({text : formValue.compositeProduct[0].name, bold:true}) : productInfos.stack.push('');
      formValue.compositeProduct[0].description != undefined ? productInfos.stack.push({text: formValue.compositeProduct[0].description, italics:true}) : productInfos.stack.push('');
      numberOfRentDays != undefined && formValue.compositeProduct[0].type === "rental" ? productInfos.stack.push('Location '+ numberOfRentDays+' j') : productInfos.stack.push('');
      compositeProductRow.push(productInfos);
      formValue.compositeProductAmount != undefined ? compositeProductRow.push(formValue.compositeProductAmount) : compositeProductRow.push('');
      price != undefined ? compositeProductRow.push(this.formatToTwoDecimal(price) + ' €HT') : compositeProductRow.push('');
      if (numberOfRentDays>1) {
        (price != undefined && formValue.compositeProductAmount != undefined) ? compositeProductRow.push(this.formatToTwoDecimal(price * formValue.compositeProductAmount * degressivity) + ' €HT') : compositeProductRow.push('');
      }
      else {
        price != undefined && formValue.compositeProductAmount != undefined ? compositeProductRow.push(this.formatToTwoDecimal(price * formValue.compositeProductAmount*numberOfRentDays) + ' €HT') : compositeProductRow.push('');
      }
      tableProducts.push(compositeProductRow);
    }

    // PRODUITS SPECIAUX

    if (formValue.specialProductName!='' && formValue.specialProductName!=undefined && formValue.specialProductPrice!=null && formValue.specialProductPrice!=undefined && formValue.specialProductPrice>0) {
      tableProducts.push([formValue.specialProductName,'','',this.formatToTwoDecimal(formValue.specialProductPrice)+' €HT']);
    }

    // PRIX

    var pricesStack = [];
    pricesStack .push('Total HT '+ this.formatToTwoDecimal(formValue.price)+' €');
    formValue.discount>0 ?   pricesStack .push('Remise ' + formValue.discount+' %') : console.log("pas de remise affichée");
    formValue.discount>0 ?  pricesStack .push('Total HT remisé ' + this.formatToTwoDecimal(formValue.discountPrice)+' €'): console.log("pas de remise affichée");
    pricesStack.push('TVA 20% ' + this.formatToTwoDecimal(formValue.discountPrice*0.2)+' €');
    pricesStack.push('Total TTC '+ this.formatToTwoDecimal(formValue.discountPrice*1.20)+' €');// todo récupérer TVA depuis la BD
    switch (this.pdfType) {
      case PdfType.advanceInvoice:
        pricesStack.push('Acompte ('+formValue.advanceRate+'%) HT ' + this.formatToTwoDecimal(formValue.discountPrice / 100 * formValue.advanceRate) + ' €');
        pricesStack.push('TVA 20% sur acompte ' + this.formatToTwoDecimal(formValue.discountPrice * 0.20 / 100 * formValue.advanceRate) + ' €');
        pricesStack.push({text : 'Acompte à régler ('+formValue.advanceRate+'%) TTC ' + this.formatToTwoDecimal(formValue.discountPrice * 1.20 / 100 * formValue.advanceRate) + ' €',  decoration: 'underline'});
        break;
      case PdfType.balanceInvoice:
        if (formValue.credit != 0 && typeof formValue.credit === "number") {
          pricesStack.push('Acompte reçu ' + this.formatToTwoDecimal(formValue.discountPrice * 1.2 / 100 * formValue.advanceRate + formValue.credit) +' € TTC');
          pricesStack.push({text:'Solde à régler ' + this.formatToTwoDecimal((formValue.discountPrice * 1.20 / 100*(100-formValue.advanceRate)) - formValue.credit) + ' € TTC',  decoration: 'underline'});
        } else {
          pricesStack.push('Solde (' +(100-formValue.advanceRate)+'%) HT ' + this.formatToTwoDecimal(formValue.discountPrice / 100*(100-formValue.advanceRate)) + ' €');
          pricesStack.push('TVA 20% sur solde ' + this.formatToTwoDecimal(formValue.discountPrice * 0.20 / 100 * (100-formValue.advanceRate)) + ' €');
          pricesStack.push({text:'Solde à régler (' +(100-formValue.advanceRate)+'%) TTC ' + this.formatToTwoDecimal(formValue.discountPrice * 1.20 / 100*(100-formValue.advanceRate)) + ' €',  decoration: 'underline'});
        }
         break;
    }

    var docDefinition = {
      // a string or { width: number, height: number }
      pageSize: 'A4',

      // by default we use portrait, you can change it to landscape if you wish
      pageOrientation: 'portrait',

      // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
      // margins are set in point that is 1/2.54*72 cm, soit env 28.35 équivaut à 1cm
      pageMargins: [ 56, 85, 56, 85],

      info: {
        title: metaDatas.title+'-'+formValue.client.name+'-'+this.id,
        author: 'BORNE-CONCEPT',
      },

      header:     [
        {
          image: staticsPhotos.logo,
          width: 150,
          alignment : 'center',
          margin: [0, 14, 0, 0]
        },
      ],

      footer: [
        {
          text: "www.borneconcept.net",
          link: "http://www.borneconcept.net/",
          color: "#F77700",
          fontSize: 8,
          alignment: "center",
          margin: [0,0,0,8]
        },
        {
          columns: [
            {
              stack: [
                '11 rue des Perdrix, 94520 Mandres Les Roses',
                '+33 (0)l 45 95 07 53',
                'IBAN : FR76 18206000584212279000148',
                'Code BIC : AGRIFRPP882'
              ]
            },
            {
              stack: [
                'RCS Créteil : 492 764 543',
                'SAS au capital de 15 000 €',
                'Siret : 49276454300038',
                'N° TVAI : FR 61 492764543'
              ]
            },

          ],
          fontSize: 8,
          alignment: 'center',
          margin: [85, 0, 85, 56]
        }
      ],

      content: [
        {
          stack : clientStack,
          margin: [320,0,0,0]
        },
        { columns: [
            [
              {stack : orderQuotationStack},
              {text : this.getRentDateAndPlace(formValue).rentDateAndPlace}
            ],
            {
              width: '*',
              text: 'Paris, le ' + metaDatas.date,
              margin : [0,14,0,0]
            },
          ],
          margin: [0,0,0,28]
        },

        {table: {
          // headers are automatically repeated if the table spans over multiple pages
          // you can declare how many rows should be treated as headers
          headerRows: 1,
          widths: ['50%','15%', '15%', '20%'],
          body: tableProducts
          },
          layout: 'noBorders',
          margin: [0,0,0,14],
          alignment: 'left',
        },
        {
          stack : pricesStack,
          margin: [280,0,0,28]
        },
        {
          stack : conditionsStack,
          margin: [0,0,0,14]
        }
      ],
      defaultStyle: {
        //font: 'panton',
        font: 'Roboto',
        fontSize: 10,
        alignment: 'left'
      },
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

    pdfMake.fonts = {
      panton: {
        normal: 'Panton-LightCaps.otf',
        //bold: 'fontFile2.ttf',
        //italics: 'fontFile3.ttf',
        //bolditalics: 'fontFile4.ttf'
      },
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
    };
    // test

    pdfMake.createPdf(docDefinition).download(metaDatas.fileName+'-'+formValue.client.name+'-'+this.id);

  }


  tolocaleDateString(date):string {
    if (date instanceof Date && date!=null && date!=undefined) {
      return date.toLocaleDateString('fr-FR');
    }
    else return "";
  }

  formatToTwoDecimal(x) {
    return Number.parseFloat(x).toFixed(2);
  }

  // pour savoir si le devis ou facture contient des produits à la vente, si vrai, renvoie valeur vide sinon renvoie les dates et lieu de location
  getRentDateAndPlace(formValue): any {
    if (formValue.numberOfRentDays>=1) {
      var installation;
      this.tolocaleDateString(formValue.installationDate)!=''? installation = 'Installation le ' +this.tolocaleDateString(formValue.installationDate) : installation = '';
      return {rentDateAndPlace : 'Location du ' + this.tolocaleDateString(formValue.rentDateFrom)+ ' au ' + this.tolocaleDateString(formValue.rentDateTo)+ ' à ' + formValue.installationTown, livraison : installation};
    }
    else {
      return {rentDateAndPlace: '', livraison: 'Délai de livraison 4 semaines'}
    }
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
      for (var i = 0; i < formValue.singleProduct.length; i++) {
        if (formValue.singleProduct[i] != "") {
          if (formValue.singleProduct[i].type === "sale" || formValue.singleProduct[i].type === "service") {
            console.log("getSingleProductsPrice type === sale or service", Number(formValue.singleProduct[i].sell_price * formValue.singleProductAmount[i]));
            price += Number(formValue.singleProduct[i].sell_price * formValue.singleProductAmount[i]);
          }
          else {
            if (numberOfRentDays>=1) {
              var degressivity;
              formValue.singleProduct[i].apply_degressivity == "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
              console.log("getSingleProductsPrice type === rental", Number(formValue.singleProduct[i].rent_price) * formValue.singleProductAmount[i] * degressivity);
              numberOfRentDays > 1 ? price += Number(formValue.singleProduct[i].rent_price) * formValue.singleProductAmount[i] * degressivity : price += Number(formValue.singleProduct[i].rent_price) * formValue.singleProductAmount[i];
            }
          }
        }
      }

      console.log("price : ", price);

      for (var i = 0; i < formValue.compositeProduct.length; i++) {
        if (formValue.compositeProduct[i] != "") {
          if (formValue.compositeProduct[i].type === "sale" || formValue.compositeProduct[i].type === "service" ) {
            console.log("getCompositeProductsPrice type === sale or service", Number(formValue.compositeProduct[i].sell_price * formValue.compositeProductAmount));
            price += Number(formValue.compositeProduct[i].sell_price * formValue.compositeProductAmount);
          }
          else {
            if (numberOfRentDays>=1) {
              var degressivity;
              formValue.compositeProduct[i].apply_degressivity == "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
              console.log("getCompositeProductsPrice type === rental", Number(formValue.compositeProduct[i].rent_price) * formValue.compositeProductAmount * degressivity);
              numberOfRentDays > 1 ? price += Number(formValue.compositeProduct[i].rent_price) * formValue.compositeProductAmount * degressivity : price += Number(formValue.compositeProduct[i].rent_price) * formValue.compositeProductAmount;
            }
          }
        }
      }

    price+=Number(formValue.specialProductPrice);
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
