import { Injectable } from '@angular/core';
//import {Order} from "../order/order"
//import { AngularFireStorage } from '@angular/fire/storage';
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

  constructor(private computePriceService: ComputePriceService) {
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
          formValue.deliveryComment
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
      formValue.client.name,
      formValue.contact.contactName,
      formValue.contact.contactEmail,
      formValue.contact.contactCellPhone,
      formValue.contact.contactPhone,
    ];

    var deliveryPreparationStack = [ // les infos n° devis, dates location...
      {text : metaDatas.title + this.id,
        bold: true, margin:[0,0,0,20]},
      'Adresse de livraison : ' + formValue.installationAddress,
      'Date de livraison : ' + this.tolocaleDateString(formValue.installationDate),
      'Heure de livraison : ' + formValue.installationHours,
      'Nom du contact sur place: '+ formValue.installationContactName,
      'Téléphone du contact sur place: '+ formValue.installationContactPhone,
    ];

    // tableau des produits
    var tableProducts : Array<any>;
    var isSaleDeliveryReceipt:boolean = false; // pour savoir si on génère un bon de préparation / livraison en vue d'une vente ou d'une location

    if (formValue.singleProduct.find(e=>e.type==="sale")=== undefined  && formValue.compositeProduct.find(e=>e.type==="sale")=== undefined ) { // si aucun élément de type vente est trouvé, on génère un bon de livraion / préparation en vue d'une location
      this.pdfType===PdfType.deliveryReceipt ? tableProducts =[['',{alignment:'center', bold:true, text:'Quantité'}, {alignment:'center', bold:true, text:'dates location'},'']] : tableProducts =[['',{alignment:'center', bold:true, text:'Quantité'}, {alignment:'center', bold:true, text:'dates location'}, {alignment:'center', bold:true, text:'dates immobilisation'}]];
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
        formValue.singleProduct[i].description != undefined ? productInfos.stack.push({text:formValue.singleProduct[i].description, italics:true, fontSize:8}) : productInfos.stack.push('');
        numberOfRentDays != undefined && formValue.singleProduct[i].type==="rental" ? productInfos.stack.push('Location '+ numberOfRentDays+' j') : productInfos.stack.push('');
        singleProductRow.push(productInfos);
        (formValue.singleProductAmount[i] != undefined && formValue.singleProduct[i].name !=undefined && formValue.singleProduct[i].name !='') ? singleProductRow.push({alignment:'center', text:formValue.singleProductAmount[i]}) : singleProductRow.push('');
        if (formValue.singleProduct[i].type ==="rental" && formValue.rentDateFrom!==undefined && formValue.rentDateFrom!=='' && formValue.rentDateFrom!=null && formValue.rentDateTo!==undefined && formValue.rentDateTo!=='' && formValue.rentDateTo!=null) {
          location = 'Du '+formValue.rentDateFrom.toLocaleDateString('fr-FR')+ ' au '+formValue.rentDateTo.toLocaleDateString('fr-FR');
        }
        if (formValue.singleProduct[i].type ==="rental" && formValue.immoDateFrom!==undefined && formValue.immoDateFrom!=='' && formValue.immoDateFrom!=null && formValue.immoDateTo!==undefined && formValue.immoDateTo!=='' && formValue.immoDateTo!=null) {
          immobilisation = 'Du '+formValue.immoDateFrom.toLocaleDateString('fr-FR')+ ' au '+formValue.immoDateTo.toLocaleDateString('fr-FR');
        }
        if (!isSaleDeliveryReceipt) {this.pdfType===PdfType.deliveryReceipt ? singleProductRow.push(location,'') : singleProductRow.push(location, immobilisation);}
        tableProducts.push(singleProductRow);
      }
    }

    // PRODUITS COMPOSES
    for (var i = 0; i < formValue.compositeProduct.length; i++) {
      if (formValue.compositeProduct[i].type !== "service") {// on ne fait pas apparaître les prestations de service dans les bons de prépararion ou de livraions
        let compositeProductRow= [], immobilisation='', location='', numberOfRentDays= 1, productInfos = {stack: []};
        if (formValue.compositeProduct[i].type === "rental" ) { numberOfRentDays = formValue.numberOfRentDays;}
        formValue.compositeProduct[i].name != undefined ? productInfos.stack.push({text:formValue.compositeProduct[i].name, bold:true}) : productInfos.stack.push('');
        formValue.compositeProduct[i].description != undefined ? productInfos.stack.push({text:formValue.compositeProduct[i].description, italics:true, fontSize:8}) : productInfos.stack.push('');
        numberOfRentDays != undefined && formValue.compositeProduct[i].type === "rental" ? productInfos.stack.push('Location '+ numberOfRentDays+' j') : productInfos.stack.push('');
        compositeProductRow.push(productInfos);
        (formValue.compositeProductAmount != undefined && formValue.compositeProduct[i].name !=undefined && formValue.compositeProduct[i].name !='')? compositeProductRow.push({alignment:'center', text: formValue.compositeProductAmount}) : compositeProductRow.push('');
        if (formValue.compositeProduct[i].type ==="rental" && formValue.rentDateFrom!==undefined && formValue.rentDateFrom!=='' && formValue.rentDateFrom!=null && formValue.rentDateTo!==undefined && formValue.rentDateTo!=='' && formValue.rentDateTo!=null) {
          location = 'Du '+formValue.rentDateFrom.toLocaleDateString('fr-FR')+ ' au '+formValue.rentDateTo.toLocaleDateString('fr-FR');
        }
        if (formValue.compositeProduct[i].type ==="rental" && formValue.immoDateFrom!==undefined && formValue.immoDateFrom!=='' && formValue.immoDateFrom!=null && formValue.immoDateTo!==undefined && formValue.immoDateTo!=='' && formValue.immoDateTo!=null) {
          immobilisation = 'Du '+formValue.immoDateFrom.toLocaleDateString('fr-FR')+ ' au '+formValue.immoDateTo.toLocaleDateString('fr-FR');
        }
        if (!isSaleDeliveryReceipt) {this.pdfType===PdfType.deliveryReceipt ? compositeProductRow.push(location,'') : compositeProductRow.push(location, immobilisation);}
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
      pageMargins: [ 28, 75, 28, 65],

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
                'IBAN: FR28 3000 2004 0600 0037 5549 X21',
                'CODE BIC: CRLYFRPP'
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
          margin: [45, 0, 45, 0]
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
            margin : [50,14,0,0]
          },
        ],
          margin: [0,0,0,28]
        },

        {table: {
          // headers are automatically repeated if the table spans over multiple pages
          // you can declare how many rows should be treated as headers
          headerRows: 1,
          widths: ['50%','10%', 'auto', 'auto'],
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
        fontSize: 11,
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
    this.getPrices(formValue);
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
            formValue.client.name,
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
              'Règlement par chèque à l\'ordre de "BORNE CONCEPT" ou par virement : ',
              'Banque: 30002 - Indicatif: 00406 - Numéro de compte: 0000375549X - Clé RIB: 21 ',
              'Domiciliation: CL PARIS CADET PELETIER (00406)',
              'Titulaire du compte: BORNE CONCEPT',
              'IBAN: FR28 3000 2004 0600 0037 5549 X21',
              'CODE BIC: CRLYFRPP'],
              margin: [0, 28,]

            },
          {stack : [
            {text : 'Conditions de règlement : ',  decoration: 'underline'},
            'Règlement dès réception de la facture.',
            'En cas de retard de paiement, seront exigibles, conformément à l\'article L 441-6 du code du commerce, une indemnité calculée sur la base de trois fois le taux de l\'intérêt légal en vigueur ainsi qu\'une indemnité forfaitaire pour frais de recouvrement de 40 €',
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
          formValue.client.name,
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
            'Règlement par chèque à l\'ordre de "BORNE CONCEPT" ou par virement : ',
            'Banque: 30002 - Indicatif: 00406 - Numéro de compte: 0000375549X - Clé RIB: 21 ',
            'Domiciliation: CL PARIS CADET PELETIER (00406)',
            'Titulaire du compte: BORNE CONCEPT',
            'IBAN: FR28 3000 2004 0600 0037 5549 X21',
            'CODE BIC: CRLYFRPP'],
            margin: [0, 14,]

          },
          {stack : [
            {text : 'Conditions de règlement : ',  decoration: 'underline'},
            'Règlement dès réception de la facture.',
            'En cas de retard de paiement, seront exigibles, conformément à l\'article L 441-6 du code du commerce, une indemnité calculée sur la base de trois fois le taux de l\'intérêt légal en vigueur ainsi qu\'une indemnité forfaitaire pour frais de recouvrement de 40 €',
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
          formValue.client.name,
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
            heights: [14, 70],
            body: [
              ['Bon pour accord', 'date', 'Cachet de la société'],
              ['signature', '', '']
            ]
          }, margin: [0,14]},
         // 'La société Borne Concept met à présent tout en œuvre pour la réussite de votre manifestation en vous accompagnant en amont de votre événement dans la préparation, la configuration, la livraison, l\'installation, la hot line, l\'intervention sur site et la reprise en fin d\'événement.',
          'Assurance bris et vol à la charge du client',
          {stack: [{text : 'Conditions générales de vente : ',  decoration: 'underline', margin:[0,12,0,0]},
            'Acompte 40% à la commande, solde dès réception de la facture, validité de l’offre 30 jours.',
            'En cas de retard de paiement, seront exigibles, conformément à l\'article L 441-6 du code du commerce, une indemnité calculée sur la base de trois fois le taux de l\'intérêt légal en vigueur ainsi qu\'une indemnité forfaitaire pour frais de recouvrement de 40 €'
          ],
          fontSize:8},
          ];
        break;
    }

    var tableProducts =[['', {alignment: 'center', bold:true, text: 'Quantité'}, {alignment: 'right', bold:true, text: 'Prix unitaire'}, {alignment: 'right', bold:true, text: 'Prix HT'}]];

    // PREMIERE LIGNE PRODUITS COMPOSES AVEC LE PRIX
    if (formValue.compositeProduct[0]!='') {
      var compositeProductRow = [];
      let price = this.computePriceService.getCompositeProductsPrice(formValue.compositeProduct);
      let numberOfRentDays=1;
      let degressivity=1;
      if (formValue.compositeProduct[0].type ==="rental") {
        numberOfRentDays = Number(formValue.numberOfRentDays);
        formValue.compositeProduct[0].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays/10 : degressivity = numberOfRentDays;
      }

      let productInfos = {stack: []};
      formValue.compositeProduct[0].name != undefined ? productInfos.stack.push({text : formValue.compositeProduct[0].name, bold:true}) : productInfos.stack.push('');
      formValue.compositeProduct[0].description != undefined ? productInfos.stack.push({text: formValue.compositeProduct[0].description, italics:true, fontSize:8}) : productInfos.stack.push('');
     // numberOfRentDays != undefined && formValue.compositeProduct[0].type === "rental" ? productInfos.stack.push('Location '+ numberOfRentDays+' j') : productInfos.stack.push('');
      compositeProductRow.push(productInfos);
      formValue.compositeProductAmount != undefined ? compositeProductRow.push({alignment: 'center', text: formValue.compositeProductAmount}) : compositeProductRow.push('');
      if (numberOfRentDays>1) {
        price != undefined ? compositeProductRow.push({alignment: 'right', text: this.formatToTwoDecimal(price * degressivity) + ' €HT'}) : compositeProductRow.push('');
        (price != undefined && formValue.compositeProductAmount != undefined) ? compositeProductRow.push({alignment: 'right', text: this.formatToTwoDecimal(price * formValue.compositeProductAmount * degressivity) + ' €HT'}) : compositeProductRow.push('');
      }
      else {
        price != undefined ? compositeProductRow.push({alignment: 'right', text: this.formatToTwoDecimal(price*numberOfRentDays) + ' €HT'}) : compositeProductRow.push('');
        price != undefined && formValue.compositeProductAmount != undefined ? compositeProductRow.push({alignment: 'right', text: this.formatToTwoDecimal(price * formValue.compositeProductAmount*numberOfRentDays) + ' €HT'}) : compositeProductRow.push('');
      }

      tableProducts.push(compositeProductRow);
    }

    // LIGNE SUIVANTE PRODUITS COMPOSES SANS LE PRIX
    for (var i = 1; i < formValue.compositeProduct.length; i++) {
      if (formValue.compositeProduct[i]!='') {
         let productInfos = {stack: []};
       // formValue.compositeProduct[i].name != undefined ? productInfos.stack.push({text:formValue.compositeProduct[i].name, bold:true}) : productInfos.stack.push('');
        formValue.compositeProduct[i].description != undefined ? productInfos.stack.push({text:formValue.compositeProduct[i].description, italics:true, fontSize:8}) : productInfos.stack.push('');
        compositeProductRow =[productInfos,'','',''];
        tableProducts.push(compositeProductRow);
      }
    }

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
        formValue.singleProduct[i].description != undefined ? productInfos.stack.push({text:formValue.singleProduct[i].description, italics:true, fontSize:8}) : productInfos.stack.push('');
       // numberOfRentDays != undefined && formValue.singleProduct[i].type === "rental" ? productInfos.stack.push('Location '+ numberOfRentDays+' j') : productInfos.stack.push('');
        singleProductRow.push(productInfos);
        formValue.singleProductAmount[i] != undefined ? singleProductRow.push({alignment: 'center', text: formValue.singleProductAmount[i]}) : singleProductRow.push('');
        if (numberOfRentDays>1) {
          price != undefined ? singleProductRow.push({alignment: 'right', text: this.formatToTwoDecimal(price*degressivity)+' €HT'}) : singleProductRow.push('');
          (price != undefined && formValue.singleProductAmount[i] != undefined) ? singleProductRow.push({alignment: 'right', text: this.formatToTwoDecimal(price*formValue.singleProductAmount[i]*degressivity)+' €HT'}) : singleProductRow.push('');
        }
        else {
          price != undefined ? singleProductRow.push({alignment: 'right', text: this.formatToTwoDecimal(price*numberOfRentDays)+' €HT'}) : singleProductRow.push('');
          (price != undefined && formValue.singleProductAmount[i] != undefined) ? singleProductRow.push({alignment: 'right', text: this.formatToTwoDecimal(price*formValue.singleProductAmount[i]*numberOfRentDays)+' €HT'}) : singleProductRow.push('');
        }
        tableProducts.push(singleProductRow);
      }
    }

    // PRODUITS SPECIAUX
    for(var i = 0; i < formValue.specialProduct.length; i++) {
      if (formValue.specialProduct[i]!='' && formValue.specialProduct[i]!=undefined && formValue.specialProductPrice[i]!=null && formValue.specialProductPrice[i]!=undefined && formValue.specialProductPrice[i]>0) {
        var tableProductsRow = [];
        tableProductsRow.push({text: formValue.specialProduct[i], bold:true});
        tableProductsRow.push('');
        tableProductsRow.push('');
        tableProductsRow.push({alignment:'right', text: this.formatToTwoDecimal(formValue.specialProductPrice[i])+' €HT'});
        tableProducts.push(tableProductsRow);
      }
    }


    // PRIX

    var pricesStack = [];
    pricesStack .push({columns: [{width:'65%', text: 'Total HT '}, {width:'35%', alignment: 'right', text: this.formatToTwoDecimal(formValue.price)+' €'}]});
    formValue.discount>0 ?   pricesStack .push({columns: [{width:'65%', text: 'Remise sur location '+formValue.discount+'% '}, {width:'35%', alignment: 'right', text: this.formatToTwoDecimal(formValue.discountAmont)+' €'}]}) : console.log("pas de remise affichée");
    formValue.discount>0 ?  pricesStack .push({columns: [{width:'65%', text: 'Total HT remisé '}, {width:'35%', alignment: 'right', text: this.formatToTwoDecimal(formValue.discountPrice)+' €'}]}): console.log("pas de remise affichée");
    switch (this.pdfType) {
      case PdfType.quotation:
        pricesStack.push({columns: [{width:'65%', text: 'TVA 20% '}, {width:'35%', alignment: 'right', text: this.formatToTwoDecimal(formValue.discountPrice*0.2)+' €'}]});
        pricesStack.push({columns: [{width:'65%', bold:true, text: 'Total TTC '}, {width:'35%', alignment: 'right', bold:true, text: this.formatToTwoDecimal(formValue.discountPrice*1.20)+' €'}]});// todo récupérer TVA depuis la BD
        break;

      case PdfType.advanceInvoice:
        pricesStack.push({columns: [{width:'65%', text: 'Acompte ('+formValue.advanceRate+'%) HT '}, {width:'35%', alignment: 'right', text: this.formatToTwoDecimal(formValue.discountPrice / 100 * formValue.advanceRate) + ' €'}]});
        pricesStack.push({columns: [{width:'65%', text: 'TVA 20% sur acompte '}, {width:'35%', alignment: 'right', text: this.formatToTwoDecimal(formValue.discountPrice * 0.20 / 100 * formValue.advanceRate) + ' €'}]});
        pricesStack.push({columns: [{width:'65%', bold:true, text : 'Acompte à régler ('+formValue.advanceRate+'%) TTC ', decoration: 'underline'}, {width:'35%', bold:true, alignment:'right', text: this.formatToTwoDecimal(formValue.discountPrice * 1.20 / 100 * formValue.advanceRate) + ' €',  decoration: 'underline'}]});
        break;
      case PdfType.balanceInvoice:
        if (formValue.credit != 0 && typeof formValue.credit === "number") {
          pricesStack.push({columns: [{width:'65%', text: 'TVA 20%'}, {width:'35%', alignment: 'right', text: this.formatToTwoDecimal(formValue.discountPrice * 0.20 / 100 * (100-formValue.advanceRate)) + ' €'}]});
          pricesStack.push({columns: [{width:'65%', text: 'Total TTC '}, {width:'35%', alignment: 'right', text: this.formatToTwoDecimal(formValue.discountPrice*1.20)+' €'}]});
          pricesStack.push({columns: [{width:'65%', text: 'Acompte reçu '}, {width:'35%', alignment: 'right', text: this.formatToTwoDecimal(formValue.discountPrice * 1.2 / 100 * formValue.advanceRate + formValue.credit) +' €'}]});
          pricesStack.push({columns: [{width:'65%', bold:true, text:'Solde à régler ' , decoration: 'underline'}, {width:'35%', bold:true, alignment:'right',text: this.formatToTwoDecimal((formValue.discountPrice * 1.20 / 100*(100-formValue.advanceRate)) - formValue.credit) + ' €',  decoration: 'underline'}]});
        } else {
          pricesStack.push({columns: [{width:'65%', text: 'Solde (' +(100-formValue.advanceRate)+'%) HT '}, {width:'35%', alignment: 'right', text: this.formatToTwoDecimal(formValue.discountPrice / 100*(100-formValue.advanceRate)) + ' €'}]});
          pricesStack.push({columns: [{width:'65%', text: 'TVA 20% sur solde '}, {width:'35%', alignment: 'right', text: this.formatToTwoDecimal(formValue.discountPrice * 0.20 / 100 * (100-formValue.advanceRate)) + ' €'}]});
          pricesStack.push({columns: [{width:'65%', bold:true, text:'Solde à régler (' +(100-formValue.advanceRate)+'%) TTC ' , decoration: 'underline'}, {width:'35%', alignment:'right', text: this.formatToTwoDecimal(formValue.discountPrice * 1.20 / 100*(100-formValue.advanceRate)) + ' €',  decoration: 'underline'}]});
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
      pageMargins: [ 28, 75, 28, 65],

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
                'IBAN: FR28 3000 2004 0600 0037 5549 X21',
                'CODE BIC: CRLYFRPP'
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
          fontSize: 7,
          alignment: 'center',
          margin: [25, 0, 25, 0]
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
              margin : [50,14,0,0]
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
          stack : pricesStack,
          margin: [320,0,0,28],
        },
        {
          stack : conditionsStack,
          margin: [0,0,0,14],
          fontSize: 10,
        }
      ],
      defaultStyle: {
        //font: 'panton',
        font: 'Roboto',
        fontSize: 11,
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
     // return {rentDateAndPlace: '', livraison: 'Délai de livraison 4 semaines'}
      return {rentDateAndPlace: '', livraison: ''}
    }
  }

  getPrices(formValue) {
    const prices = this.computePriceService.computePrices(formValue);
    formValue.price = prices.price;
    formValue.discount= prices.discount;
    formValue.discountPrice = prices.discountPrice;
    formValue.discountAmont = prices.discountAmont;
    formValue.numberOfRentDays= this.computePriceService.getNumberOfRentDaysComputed(formValue.rentDateFrom, formValue.rentDateTo);
  }

}
