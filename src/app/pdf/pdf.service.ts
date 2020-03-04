import { Injectable } from '@angular/core';
import * as pdfMake from 'pdfmake/build/pdfmake.js';
import * as pdfFonts from '../../assets/fonts/vfs_fonts.js';
pdfMake.vfs = pdfFonts.pdfMake.vfs;
import {PdfType} from './pdf-type';
import {ComputePriceService} from "../price/compute-price.service";
import { staticsPhotos } from "../../assets/img/statics-photos";
import {UtilServices} from "../common-services/utilServices";

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor(private computePriceService: ComputePriceService) {
  }

  public wantGeneratePdf(formValue, id, pdfType: PdfType) {
    //console.log("wantGenerateAdvanceInvoicePdf : ", formValue, ' / ', id);
    (pdfType === PdfType.deliveryReceipt || pdfType === PdfType.preparationReceipt) ? this.generateDeliveryReceiptPdf(formValue, pdfType, id) : this.generateOrderOrQuotationPdf(formValue, pdfType, id);
  }

  private generateDeliveryReceiptPdf(formValue, pdfType, id) { // génération du bon de livraison
    //console.log("generateDeliveryReceiptPdf : ", formValue);
    let conditionsStack:Array<any> = []; // les infos de conditions générales, paiement ...

    let metaDatas = {
      date: '',
      title: '',
      fileName: '',
    };

    let clientOrderNumberString;
    formValue.clientOrderNumber != "" ? clientOrderNumberString = 'Référence commande client n° ' + formValue.clientOrderNumber : clientOrderNumberString = '';

    switch (pdfType) {
      case PdfType.deliveryReceipt:
        metaDatas = {
          date: formValue.orderDate.toLocaleDateString("fr-FR"),
          title: 'Bon de livraison commande BC n° ',
          fileName: 'bon-livraison'
        };
        conditionsStack = [
          formValue.deliveryComment,
          {
            table: {
              widths: [100, 100, '*'],
              heights: [14, 70],
              body: [
                ['Date', 'Signature client', 'Observations'],
                ['', '', '']
              ]
            }, margin: [0, 14]
          },
        ];
        break;

      case PdfType.preparationReceipt:
        metaDatas = {
          date: formValue.orderDate.toLocaleDateString("fr-FR"),
          title: 'Bon de préparation commande BC n° ',
          fileName: 'bon-preparation'
        };
        conditionsStack = [
          formValue.deliveryComment,
          formValue.privateQuotationComment,
        ];
    }

    let clientStack = [ // les infos clients en en-tête (nom, adresse, contac../
      formValue.client.name,
      formValue.contact.contactName,
      formValue.contact.contactEmail,
      formValue.contact.contactCellPhone,
      formValue.contact.contactPhone,
    ];

    let deliveryPreparationStack = [ // les infos n° devis, dates location...
      {
        text: metaDatas.title + id,
        bold: true, margin: [0, 0, 0, 20]
      },
      clientOrderNumberString,
      'Référence devis n° : ' + formValue.quotationId,
      'Adresse de livraison : ' + formValue.installationAddress,
      'Date de livraison : ' + this.tolocaleDateString(formValue.installationDate),
      'Heure de livraison : ' + formValue.installationHours,
      'Nom du contact sur place: ' + formValue.installationContactName,
      'Téléphone du contact sur place: ' + formValue.installationContactPhone,
    ];

    // tableau des produits
    let tableProducts:Array<any>;
    let isSaleDeliveryReceipt:boolean = false; // pour savoir si on génère un bon de préparation / livraison en vue d'une vente ou d'une location

    if (formValue.singleProduct.find(e=>e.type === "sale") === undefined && formValue.compositeProducts.find(e=>e.type === "sale") === undefined) { // si aucun élément de type vente est trouvé, on génère un bon de livraion / préparation en vue d'une location
      pdfType === PdfType.deliveryReceipt ? tableProducts = [['', {
        alignment: 'center',
        bold: true,
        text: 'Quantité'
      }, {alignment: 'center', bold: true, text: 'dates location'}, '']] : tableProducts = [['', {
        alignment: 'center',
        bold: true,
        text: 'Quantité'
      }, {alignment: 'center', bold: true, text: 'dates location'}, {
        alignment: 'center',
        bold: true,
        text: 'dates immobilisation'
      }]];
    }
    else { // sinon on génère un bon de livraion / préparation en vue d'une vente
      tableProducts = [['', 'Quantité']];
      isSaleDeliveryReceipt = true;
    }
    //console.log("isSaleDeliveryReceipt", isSaleDeliveryReceipt);

    // PRODUITS SIMPLES
    for (let i = 0; i < formValue.singleProduct.length; i++) {
      if (formValue.singleProduct[i].type !== "service") { // on ne fait pas apparaître les prestations de service dans les bons de prépararion ou de livraions
        let singleProductRow = [], immobilisation = '', location = '', numberOfRentDays = 1, productInfos = {stack: []};
        if (formValue.singleProduct[i].type === "rental") {
          numberOfRentDays = formValue.numberOfRentDays;
        }
        formValue.singleProduct[i].name != undefined ? productInfos.stack.push({
          text: formValue.singleProduct[i].name,
          bold: true
        }) : productInfos.stack.push('');
        formValue.singleProduct[i].description != undefined ? productInfos.stack.push({
          text: formValue.singleProduct[i].description,
          italics: true,
          fontSize: 8
        }) : productInfos.stack.push('');
        numberOfRentDays != undefined && formValue.singleProduct[i].type === "rental" ? productInfos.stack.push('Location ' + numberOfRentDays + ' j') : productInfos.stack.push('');
        singleProductRow.push(productInfos);
        (formValue.singleProductAmount[i] != undefined && formValue.singleProduct[i].name != undefined && formValue.singleProduct[i].name != '') ? singleProductRow.push({
          alignment: 'center',
          text: formValue.singleProductAmount[i]
        }) : singleProductRow.push('');
        if (formValue.singleProduct[i].type === "rental" && formValue.rentDateFrom !== undefined && formValue.rentDateFrom !== '' && formValue.rentDateFrom != null && formValue.rentDateTo !== undefined && formValue.rentDateTo !== '' && formValue.rentDateTo != null) {
          location = 'Du ' + formValue.rentDateFrom.toLocaleDateString('fr-FR') + ' au ' + formValue.rentDateTo.toLocaleDateString('fr-FR');
        }
        if (formValue.singleProduct[i].type === "rental" && formValue.immoDateFrom !== undefined && formValue.immoDateFrom !== '' && formValue.immoDateFrom != null && formValue.immoDateTo !== undefined && formValue.immoDateTo !== '' && formValue.immoDateTo != null) {
          immobilisation = 'Du ' + formValue.immoDateFrom.toLocaleDateString('fr-FR') + ' au ' + formValue.immoDateTo.toLocaleDateString('fr-FR');
        }
        if (!isSaleDeliveryReceipt) {
          pdfType === PdfType.deliveryReceipt ? singleProductRow.push(location, '') : singleProductRow.push(location, immobilisation);
        }
        tableProducts.push(singleProductRow);
      }
    }

    // PRODUITS COMPOSES
    for (let idxPdt = 0; idxPdt < formValue.compositeProducts.length; idxPdt++) {
      for (let i = 0; i < formValue.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (formValue.compositeProducts[idxPdt].compositeProductElements[i].type !== "service") {// on ne fait pas apparaître les prestations de service dans les bons de prépararion ou de livraions
          let compositeProductRow = [], immobilisation = '', location = '', numberOfRentDays = 1, productInfos = {stack: []};
          if (formValue.compositeProducts[idxPdt].compositeProductElements[i].type === "rental") {
            numberOfRentDays = formValue.numberOfRentDays;
          }
          formValue.compositeProducts[idxPdt].compositeProductElements[i].name != undefined ? productInfos.stack.push({
            text: formValue.compositeProducts[idxPdt].compositeProductElements[i].name,
            bold: true
          }) : productInfos.stack.push('');
          formValue.compositeProducts[idxPdt].compositeProductElements[i].description != undefined ? productInfos.stack.push({
            text: formValue.compositeProducts[idxPdt].compositeProductElements[i].description,
            italics: true,
            fontSize: 8
          }) : productInfos.stack.push('');
          numberOfRentDays != undefined && formValue.compositeProducts[idxPdt].compositeProductElements[i].type === "rental" ? productInfos.stack.push('Location ' + numberOfRentDays + ' j') : productInfos.stack.push('');
          compositeProductRow.push(productInfos);
          (formValue.compositeProductAmount[idxPdt] != undefined && formValue.compositeProducts[idxPdt].compositeProductElements[i].name != undefined && formValue.compositeProducts[idxPdt].compositeProductElements[i].name != '') ? compositeProductRow.push({
            alignment: 'center',
            text: formValue.compositeProductAmount[idxPdt]
          }) : compositeProductRow.push('');
          if (formValue.compositeProducts[idxPdt].compositeProductElements[i].type === "rental" && formValue.rentDateFrom !== undefined && formValue.rentDateFrom !== '' && formValue.rentDateFrom != null && formValue.rentDateTo !== undefined && formValue.rentDateTo !== '' && formValue.rentDateTo != null) {
            location = 'Du ' + formValue.rentDateFrom.toLocaleDateString('fr-FR') + ' au ' + formValue.rentDateTo.toLocaleDateString('fr-FR');
          }
          if (formValue.compositeProducts[idxPdt].compositeProductElements[i].type === "rental" && formValue.immoDateFrom !== undefined && formValue.immoDateFrom !== '' && formValue.immoDateFrom != null && formValue.immoDateTo !== undefined && formValue.immoDateTo !== '' && formValue.immoDateTo != null) {
            immobilisation = 'Du ' + formValue.immoDateFrom.toLocaleDateString('fr-FR') + ' au ' + formValue.immoDateTo.toLocaleDateString('fr-FR');
          }
          if (!isSaleDeliveryReceipt) {
            pdfType === PdfType.deliveryReceipt ? compositeProductRow.push(location, '') : compositeProductRow.push(location, immobilisation);
          }
          tableProducts.push(compositeProductRow);
        }
      }
    }


    let docDefinition = {
      // a string or { width: number, height: number }
      pageSize: 'A4',

      // by default we use portrait, you can change it to landscape if you wish
      pageOrientation: 'portrait',

      // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
      // margins are set in point that is 1/2.54*72 cm, soit env 28.35 équivaut à 1cm
      pageMargins: [ 28, 75, 28, 65],

      info: {
        title: metaDatas.title+'-'+formValue.client.name+'-' + id,
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

    //console.log("docDefinition", docDefinition);
    pdfMake.createPdf(docDefinition).download(metaDatas.fileName+'-'+formValue.client.name+'-' + id);
  }

  private generateOrderOrQuotationPdf(formValue, pdfType, id) { // génération du devis ou de la facture
    //console.log("generateOrderOrQuotationPdf : ", formValue);
    this.getPrices(formValue);
    let metaDatas = {
      date: '',
      title: '',
      fileName: '',
      fileNumber: ''

    };
    let clientStack:Array<any> = []; // les infos clients en en-tête (nom, adresse, contac../
    let orderQuotationStack:Array<any> = []; // les infos n° devis, dates location...
    let conditionsStack:Array<any> = []; // les infos de conditions générales, paiement ...

    let clientOrderNumberString;
    formValue.clientOrderNumber != "" ? clientOrderNumberString = 'Référence commande client n° ' + formValue.clientOrderNumber : clientOrderNumberString = '';

    let referenceClient;
    (formValue.referenceClient !== undefined && formValue.referenceClient !=='') ?  referenceClient = 'Référence client : ' + formValue.referenceClient : referenceClient = '';

    let options = ""; // for optional products
    let tableOptionalProducts = [];
    tableOptionalProducts.push(['', '', '', '']); // optional products

    let optionalLongRentalStack = [];

    switch (pdfType) {
      case PdfType.advanceInvoice:
        metaDatas = {
          date: formValue.orderDate.toLocaleDateString("fr-FR"),
          title: 'facture-acompte',
          fileName: 'facture-acompte',
          fileNumber: formValue.numerosInvoice.advance
        };

        clientStack = [
          formValue.client.name,
          formValue.contact.contactName,
          'Service comptabilité',
          formValue.client.address,
          formValue.client.zipcode + ' ' + formValue.client.town,
        ];

        orderQuotationStack = [
          {text: 'Facture n° ' + formValue.numerosInvoice.advance, bold: true, fontSize: 16},
          'Commande BC n° ' + id,
          'Référence devis n° ' + formValue.quotationId,
          clientOrderNumberString,
        ];
        conditionsStack = [
          formValue.orderComment,
          {
            stack: [
              'Règlement par chèque à l\'ordre de "BORNE CONCEPT" ou par virement : ',
              'Banque: 30002 - Indicatif: 00406 - Numéro de compte: 0000375549X - Clé RIB: 21 ',
              'Domiciliation: CL PARIS CADET PELETIER (00406)',
              'Titulaire du compte: BORNE CONCEPT',
              'IBAN: FR28 3000 2004 0600 0037 5549 X21',
              'CODE BIC: CRLYFRPP'],
            margin: [0, 28,]

          },
          {
            stack: [
              {text: 'Conditions de règlement : ', decoration: 'underline'},
              'Règlement dès réception de la facture.',
              'En cas de retard de paiement, seront exigibles, conformément à l\'article L 441-6 du code du commerce, une indemnité calculée sur la base de trois fois le taux de l\'intérêt légal en vigueur ainsi qu\'une indemnité forfaitaire pour frais de recouvrement de 40 €',
            ]
          }
        ];
        break;

      case PdfType.balanceInvoice:
        metaDatas = {
          date: formValue.balanceInvoiceDate.toLocaleDateString("fr-FR"),
          title: 'facture-solde',
          fileName: 'facture-solde',
          fileNumber: formValue.numerosInvoice.balance
        };
        clientStack = [
          formValue.client.name,
          formValue.contact.contactName,
          'Service comptabilité',
          formValue.client.address,
          formValue.client.zipcode + ' ' + formValue.client.town,
        ];

        orderQuotationStack = [
          {text: 'Facture n° ' + formValue.numerosInvoice.balance, bold: true},
          'Commande BC n° ' + id,
          'Référence devis n° ' + formValue.quotationId,
          clientOrderNumberString
        ];
        conditionsStack = [
          formValue.orderComment,
          {
            stack: [
              'Règlement par chèque à l\'ordre de "BORNE CONCEPT" ou par virement : ',
              'Banque: 30002 - Indicatif: 00406 - Numéro de compte: 0000375549X - Clé RIB: 21 ',
              'Domiciliation: CL PARIS CADET PELETIER (00406)',
              'Titulaire du compte: BORNE CONCEPT',
              'IBAN: FR28 3000 2004 0600 0037 5549 X21',
              'CODE BIC: CRLYFRPP'],
            margin: [0, 14,]

          },
          {
            stack: [
              {text: 'Conditions de règlement : ', decoration: 'underline'},
              'Règlement dès réception de la facture.',
              'En cas de retard de paiement, seront exigibles, conformément à l\'article L 441-6 du code du commerce, une indemnité calculée sur la base de trois fois le taux de l\'intérêt légal en vigueur ainsi qu\'une indemnité forfaitaire pour frais de recouvrement de 40 €',
            ]
          }
        ];
        break;

      case PdfType.quotation:
        metaDatas = {
          date: formValue.quotationDate.toLocaleDateString("fr-FR"),
          title: 'devis',
          fileName: 'devis',
          fileNumber: id
        };
        clientStack = [
          formValue.client.name,
          formValue.contact.contactName,
          formValue.contact.contactEmail,
          formValue.contact.contactCellPhone,
          formValue.contact.contactPhone,
        ];

        orderQuotationStack = [
          {
            text: 'Devis n° ' + id,
            bold: true
          },
          referenceClient,
          'Contact : ' + formValue.employe.name + ' ' + formValue.employe.cellPhone,
          formValue.employe.email
        ];
        conditionsStack = [
          formValue.quotationComment,
          this.getRentDateAndPlace(formValue).livraison,
          'Pour confirmer votre commande, il vous suffit de nous faire parvenir par mail à ' + formValue.employe.email + ' ce devis daté et signé avec le cachet de votre société',
          {
            table: {
              widths: [120, 80, '*'],
              heights: [14, 70],
              body: [
                ['Bon pour accord', 'date', 'Cachet de la société'],
                ['signature', '', '']
              ]
            }, margin: [0, 14]
          },
          // 'La société Borne Concept met à présent tout en œuvre pour la réussite de votre manifestation en vous accompagnant en amont de votre événement dans la préparation, la configuration, la livraison, l\'installation, la hot line, l\'intervention sur site et la reprise en fin d\'événement.',
          'Assurance bris et vol à la charge du client',
          {
            stack: [{text: 'Conditions générales de vente : ', decoration: 'underline', margin: [0, 12, 0, 0]},
              'Acompte 40% à la commande, solde dès réception de la facture, validité de l’offre 30 jours.',
              'En cas de retard de paiement, seront exigibles, conformément à l\'article L 441-6 du code du commerce, une indemnité calculée sur la base de trois fois le taux de l\'intérêt légal en vigueur ainsi qu\'une indemnité forfaitaire pour frais de recouvrement de 40 €'
            ],
            fontSize: 8
          },
        ];

        // PRODUITS OPTIONNELS
        if (formValue.optionalProduct != undefined && formValue.optionalProduct.length > 0 && formValue.optionalProduct[0] != '') {
          tableOptionalProducts = [];
          tableOptionalProducts.push(['', {alignment: 'center', bold: true, text: 'Quantité'}, {
            alignment: 'right',
            bold: true,
            text: 'Prix unitaire'
          }, {alignment: 'right', bold: true, text: 'Prix HT'}]);
          options = "OPTIONS";
        }
        for (let i = 0; i < formValue.optionalProduct.length; i++) {
          if (formValue.optionalProduct[i] != '' && formValue.optionalProduct[i] != undefined) {
            let optionalProductRow = [];
            let price, numberOfRentDays = 1, degressivity = 1;
            if (formValue.optionalProduct[i].type === "rental") {
              price = formValue.optionalProduct[i].rent_price;
              numberOfRentDays = formValue.numberOfRentDays;
              formValue.optionalProduct[i].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
            }
            else {
              price = formValue.optionalProduct[i].sell_price;
            }

            let productInfos = {stack: []};
            formValue.optionalProduct[i].name != undefined ? productInfos.stack.push({
              text: formValue.optionalProduct[i].name,
              bold: true
            }) : productInfos.stack.push('');
            formValue.optionalProduct[i].description != undefined ? productInfos.stack.push({
              text: formValue.optionalProduct[i].description,
              italics: true,
              fontSize: 8
            }) : productInfos.stack.push('');
            optionalProductRow.push(productInfos);
            formValue.optionalProductAmount[i] != undefined ? optionalProductRow.push({
              alignment: 'center',
              text: formValue.optionalProductAmount[i]
            }) : optionalProductRow.push('');
            if (numberOfRentDays > 1) {
              price != undefined ? optionalProductRow.push({
                alignment: 'right',
                text: UtilServices.formatToTwoDecimal(price * degressivity) + ' €HT'
              }) : optionalProductRow.push('');
              (price != undefined && formValue.optionalProductAmount[i] != undefined) ? optionalProductRow.push({
                alignment: 'right',
                text: UtilServices.formatToTwoDecimal(price * formValue.optionalProductAmount[i] * degressivity) + ' €HT'
              }) : optionalProductRow.push('');
            }
            else {
              price != undefined ? optionalProductRow.push({
                alignment: 'right',
                text: UtilServices.formatToTwoDecimal(price * numberOfRentDays) + ' €HT'
              }) : optionalProductRow.push('');
              (price != undefined && formValue.optionalProductAmount[i] != undefined) ? optionalProductRow.push({
                alignment: 'right',
                text: UtilServices.formatToTwoDecimal(price * formValue.optionalProductAmount[i] * numberOfRentDays) + ' €HT'
              }) : optionalProductRow.push('');
            }
            tableOptionalProducts.push(optionalProductRow);
          }
        }

        // PRODUITS OPTIONNELS
        let optionalLongRentalContent = '';
        if (formValue.optionalLongRentalMonth !== undefined && formValue.optionalLongRentalPrice !== undefined && formValue.optionalLongRentalAmount !== undefined
          && formValue.optionalLongRentalMonth !== '' && formValue.optionalLongRentalPrice !== '' && formValue.optionalLongRentalAmount !== ''
          && formValue.optionalLongRentalMonth !== 0 && formValue.optionalLongRentalPrice !== 0 && formValue.optionalLongRentalAmount !== 0
          && formValue.optionalLongRentalMonth !== null && formValue.optionalLongRentalPrice !== null && formValue.optionalLongRentalAmount !== null) {
          let optionnalLongRentalTotal = '.';
          if (formValue.optionalLongRentalAmount>1) {
            optionnalLongRentalTotal = ', soit un total de ' + formValue.optionalLongRentalAmount * formValue.optionalLongRentalPrice + '€ HT par mois pour ' + formValue.optionalLongRentalAmount + ' éléments.'
          }
          optionalLongRentalContent = 'Option location longue durée sur ' + formValue.optionalLongRentalMonth
            + ' mois avec des mensualités unitaites de ' + formValue.optionalLongRentalPrice + '€ HT' + optionnalLongRentalTotal;
        }

        optionalLongRentalStack = [
          {
            text: optionalLongRentalContent,
            bold: true
          }
        ];

        break;
    }

    let tableProducts = [['', {alignment: 'center', bold: true, text: 'Quantité'}, {
      alignment: 'right',
      bold: true,
      text: 'Prix unitaire'
    }, {alignment: 'right', bold: true, text: 'Prix HT'}]];

    // PREMIERE LIGNE PRODUITS COMPOSES AVEC LE PRIX
    for (let idxPdt = 0; idxPdt < formValue.compositeProducts.length; idxPdt++) {
      if (formValue.compositeProducts[idxPdt].compositeProductElements[0] != '') {
        let compositeProductRow = [];
        let price = ComputePriceService.getCompositeProductElementPrice(formValue.compositeProducts[idxPdt].compositeProductElements);
        let numberOfRentDays = 1;
        let degressivity = 1;
        if (formValue.compositeProducts[idxPdt].compositeProductElements[0].type === "rental") {
          numberOfRentDays = Number(formValue.numberOfRentDays);
          formValue.compositeProducts[idxPdt].compositeProductElements[0].apply_degressivity === "true" ? degressivity = 1 + numberOfRentDays / 10 : degressivity = numberOfRentDays;
        }

        let productInfos = {stack: []};
        formValue.compositeProducts[idxPdt].compositeProductElements[0].name != undefined ? productInfos.stack.push({
          text: formValue.compositeProducts[idxPdt].compositeProductElements[0].name,
          bold: true
        }) : productInfos.stack.push('');
        formValue.compositeProducts[idxPdt].compositeProductElements[0].description != undefined ? productInfos.stack.push({
          text: formValue.compositeProducts[idxPdt].compositeProductElements[0].description,
          italics: true,
          fontSize: 8
        }) : productInfos.stack.push('');
        // numberOfRentDays != undefined && formValue.compositeProducts[idxPdt].compositeProductElements[0].type === "rental" ? productInfos.stack.push('Location '+ numberOfRentDays+' j') : productInfos.stack.push('');
        compositeProductRow.push(productInfos);
        formValue.compositeProductAmount[idxPdt] != undefined ? compositeProductRow.push({
          alignment: 'center',
          text: formValue.compositeProductAmount[idxPdt]
        }) : compositeProductRow.push('');
        if (numberOfRentDays > 1) {
          price != undefined ? compositeProductRow.push({
            alignment: 'right',
            text: UtilServices.formatToTwoDecimal(price * degressivity) + ' €HT'
          }) : compositeProductRow.push('');
          (price != undefined && formValue.compositeProductAmount[idxPdt] != undefined) ? compositeProductRow.push({
            alignment: 'right',
            text: UtilServices.formatToTwoDecimal(price * formValue.compositeProductAmount[idxPdt] * degressivity) + ' €HT'
          }) : compositeProductRow.push('');
        }
        else {
          price != undefined ? compositeProductRow.push({
            alignment: 'right',
            text: UtilServices.formatToTwoDecimal(price * numberOfRentDays) + ' €HT'
          }) : compositeProductRow.push('');
          price != undefined && formValue.compositeProductAmount[idxPdt] != undefined ? compositeProductRow.push({
            alignment: 'right',
            text: UtilServices.formatToTwoDecimal(price * formValue.compositeProductAmount[idxPdt] * numberOfRentDays) + ' €HT'
          }) : compositeProductRow.push('');
        }

        tableProducts.push(compositeProductRow);
      }

      // LIGNE SUIVANTE PRODUITS COMPOSES SANS LE PRIX
      for (let i = 1; i < formValue.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (formValue.compositeProducts[idxPdt].compositeProductElements[i] != '') {
          let productInfos = {stack: []};
          // formValue.compositeProducts[idxPdt].compositeProductElements[i].name != undefined ? productInfos.stack.push({text:formValue.compositeProducts[idxPdt].compositeProductElements[i].name, bold:true}) : productInfos.stack.push('');
          formValue.compositeProducts[idxPdt].compositeProductElements[i].description != undefined ? productInfos.stack.push({
            text: formValue.compositeProducts[idxPdt].compositeProductElements[i].description,
            italics: true,
            fontSize: 8
          }) : productInfos.stack.push('');
          let compositeProductRow = [];
          compositeProductRow.push(productInfos, '', '','');
          tableProducts.push(compositeProductRow);
        }
      }
  }

    // PRODUITS SIMPLES
    for (let i = 0; i < formValue.singleProduct.length; i++) {
      if (formValue.singleProduct[i]!='') {
        let singleProductRow= [];
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
          price != undefined ? singleProductRow.push({alignment: 'right', text: UtilServices.formatToTwoDecimal(price*degressivity)+' €HT'}) : singleProductRow.push('');
          (price != undefined && formValue.singleProductAmount[i] != undefined) ? singleProductRow.push({alignment: 'right', text: UtilServices.formatToTwoDecimal(price*formValue.singleProductAmount[i]*degressivity)+' €HT'}) : singleProductRow.push('');
        }
        else {
          price != undefined ? singleProductRow.push({alignment: 'right', text: UtilServices.formatToTwoDecimal(price*numberOfRentDays)+' €HT'}) : singleProductRow.push('');
          (price != undefined && formValue.singleProductAmount[i] != undefined) ? singleProductRow.push({alignment: 'right', text: UtilServices.formatToTwoDecimal(price*formValue.singleProductAmount[i]*numberOfRentDays)+' €HT'}) : singleProductRow.push('');
        }
        tableProducts.push(singleProductRow);
      }
    }

    // PRODUITS SPECIAUX
    if (formValue.specialProduct !== undefined) {
      for(let i = 0; i < formValue.specialProduct.length; i++) {
        if (formValue.specialProduct[i]!='' && formValue.specialProduct[i]!=undefined && formValue.specialProductPrice[i]!=null && formValue.specialProductPrice[i]!=undefined && formValue.specialProductPrice[i]>0) {
          let tableProductsRow = [];
          tableProductsRow.push({text: formValue.specialProduct[i], bold:true});
          tableProductsRow.push('');
          tableProductsRow.push('');
          tableProductsRow.push({alignment:'right', text: UtilServices.formatToTwoDecimal(formValue.specialProductPrice[i])+' €HT'});
          tableProducts.push(tableProductsRow);
        }
      }
    }

    // PRIX

    let pricesStack = [];
    pricesStack .push({columns: [{width:'65%', text: 'Total HT '}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.price)+' €'}]});
    formValue.rentalDiscountAmount>0? pricesStack.push({columns: [{width:'65%', text: 'Remise sur location '+formValue.rentalDiscount+'% '}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.rentalDiscountAmount)+' €'}]}) : console.log("pas de remise affichée");
    formValue.saleDiscountAmount>0? pricesStack.push({columns: [{width:'65%', text: 'Remise sur vente '+formValue.saleDiscount+'% '}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.saleDiscountAmount)+' €'}]}) : console.log("pas de remise affichée");
    (formValue.rentalDiscountAmount>0 || formValue.saleDiscountAmount>0) ?  pricesStack.push({columns: [{width:'65%', text: 'Total HT remisé '}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.discountPrice)+' €'}]}): console.log("pas de remise affichée");
    switch (pdfType) {
      case PdfType.quotation:
        pricesStack.push({columns: [{width:'65%', text: 'TVA 20% '}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.discountPrice*0.2)+' €'}]});
        pricesStack.push({columns: [{width:'65%', bold:true, text: 'Total TTC '}, {width:'35%', alignment: 'right', bold:true, text: UtilServices.formatToTwoDecimal(formValue.discountPrice*1.20)+' €'}]});
        break;

      case PdfType.advanceInvoice:
        pricesStack.push({columns: [{width:'65%', text: 'Acompte ('+formValue.advanceRate+'%) HT '}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.discountPrice / 100 * formValue.advanceRate) + ' €'}]});
        pricesStack.push({columns: [{width:'65%', text: 'TVA 20% '}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.discountPrice * 0.20 / 100 * formValue.advanceRate) + ' €'}]});
        pricesStack.push({columns: [{width:'65%', bold:true, text : 'TOTAL TTC ', decoration: 'underline'}, {width:'35%', bold:true, alignment:'right', text: UtilServices.formatToTwoDecimal(formValue.discountPrice * 1.20 / 100 * formValue.advanceRate) + ' €',  decoration: 'underline'}]});
        break;
      case PdfType.balanceInvoice:
        if (formValue.credit != 0 && typeof formValue.credit === "number") {
          pricesStack.push({columns: [{width:'65%', text: 'TVA 20%'}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.discountPrice * 0.20 / 100 * (100-formValue.advanceRate)) + ' €'}]});
          pricesStack.push({columns: [{width:'65%', text: 'Total TTC '}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.discountPrice*1.20)+' €'}]});
          pricesStack.push({columns: [{width:'65%', text: 'Acompte reçu '}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.discountPrice * 1.2 / 100 * formValue.advanceRate + formValue.credit) +' €'}]});
          pricesStack.push({columns: [{width:'65%', bold:true, text:'TOTAL TTC ' , decoration: 'underline'}, {width:'35%', bold:true, alignment:'right',text: UtilServices.formatToTwoDecimal((formValue.discountPrice * 1.20 / 100*(100-formValue.advanceRate)) - formValue.credit) + ' €',  decoration: 'underline'}]});
        } else {
          if (formValue.advanceRate>0 && typeof formValue.advanceRate === "number") {pricesStack.push({columns: [{width:'65%', text: 'Solde (' +(100-formValue.advanceRate)+'%) HT '}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.discountPrice / 100*(100-formValue.advanceRate)) + ' €'}]})}
          pricesStack.push({columns: [{width:'65%', text: 'TVA 20% '}, {width:'35%', alignment: 'right', text: UtilServices.formatToTwoDecimal(formValue.discountPrice * 0.20 / 100 * (100-formValue.advanceRate)) + ' €'}]});
          pricesStack.push({columns: [{width:'65%', bold:true, text:'TOTAL TTC ' , decoration: 'underline'}, {width:'35%', alignment:'right', text: UtilServices.formatToTwoDecimal(formValue.discountPrice * 1.20 / 100*(100-formValue.advanceRate)) + ' €',  decoration: 'underline'}]});
        }
         break;
    }

    let docDefinition = {
      // a string or { width: number, height: number }
      pageSize: 'A4',

      // by default we use portrait, you can change it to landscape if you wish
      pageOrientation: 'portrait',

      // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
      // margins are set in point that is 1/2.54*72 cm, soit env 28.35 équivaut à 1cm
      pageMargins: [ 28, 75, 28, 65],

      info: {
        title: metaDatas.title+'-'+formValue.client.name+'-' + id,
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
          margin: [320,0,0,14],
        },
        {
          text: options,
          fontSize: 10,
          bold: true,
          margin: [0,0,0,0]
        },
        {table: {
          // headers are automatically repeated if the table spans over multiple pages
          // you can declare how many rows should be treated as headers
          headerRows: 1,
          widths: ['50%','10%', '20%', '20%'],
          body: tableOptionalProducts
        },
          layout: 'noBorders',
          margin: [0,0,0,14],
          alignment: 'left',
        },
        {
          stack : optionalLongRentalStack,
          margin: [0,0,0,14],
          fontSize: 10,
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
      //console.log("docDefinition", docDefinition);

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

    pdfMake.createPdf(docDefinition).download(metaDatas.fileName+'-'+formValue.client.name+'-'+metaDatas.fileNumber);

  }


  tolocaleDateString(date):string {
    if (date instanceof Date) {
      return date.toLocaleDateString('fr-FR');
    }
    else return "";
  }


  // pour savoir si le devis ou facture contient des produits à la vente, si vrai, renvoie valeur vide sinon renvoie les dates et lieu de location
  getRentDateAndPlace(formValue): any {
    if (formValue.numberOfRentDays>=1) {
      let installation;
      this.tolocaleDateString(formValue.installationDate)!=''? installation = 'Installation le ' +this.tolocaleDateString(formValue.installationDate) : installation = '';
      return {rentDateAndPlace : 'Location du ' + this.tolocaleDateString(formValue.rentDateFrom)+ ' au ' + this.tolocaleDateString(formValue.rentDateTo)+ ' à ' + formValue.installationTown, livraison : installation};
    }
    else {
      return {rentDateAndPlace: '', livraison: ''}
    }
  }

  private getPrices(formValue) {
    const prices = this.computePriceService.computePrices(formValue);
    formValue.price = prices.price;
    formValue.rentalDiscount= prices.rentalDiscount;
    formValue.saleDiscount= prices.saleDiscount;
    formValue.discountPrice = prices.discountPrice;
    formValue.rentalDiscountAmount = prices.rentalDiscountAmount;
    formValue.saleDiscountAmount = prices.saleDiscountAmount;
    formValue.numberOfRentDays = ComputePriceService.getNumberOfRentDaysComputed(formValue.rentDateFrom, formValue.rentDateTo);
  }

}
