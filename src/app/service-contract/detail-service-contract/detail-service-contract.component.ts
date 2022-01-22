import {Component, OnInit, Inject, Input} from '@angular/core';
import { Client } from '../../client/client';
import {Contact} from '../../client/contact';
import { Product } from '../../product/product';
import { ServiceContract } from '../service-contract';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs'
import { tap, finalize } from 'rxjs/operators';
import {fromArray} from "rxjs/internal/observable/fromArray";
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormArray  } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs";
import { AngularFireStorage } from '@angular/fire/storage';
import {PdfService} from "../../pdf/pdf.service";
import {PdfType} from '../../pdf/pdf-type';
import {ComputePriceService} from "../../price/compute-price.service";
import {Employe} from "../../employe/employe";
import {ServiceContractFormManager} from "../../forms/serviceContractFormManager";
import {PricesFormManager} from "../../forms/pricesFormManager";
import {FirebaseServices} from "../../common-services/firebaseServices";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
import {AppComponent} from "../../app.component";

export interface ClientId extends Client { id: string; }
export interface ProductId extends Product { id: string; }
export interface EmployeId extends Employe { id: string; }
export interface DialogServiceContractData { message: string; displayNoButton:boolean; }

@Component({
  selector: 'app-detail-service-contract',
  templateUrl: './detail-service-contract.component.html',
  styleUrls: ['./detail-service-contract.component.less']
})
export class DetailServiceContractComponent implements OnInit {

  public user;

  // for client
  private fbClientsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private clientFormOptions =[]; // used by autoocmplete client form
  public clientFilteredOptions: Observable<ClientId[]>; // used by autocomplete client form

  // for contact
  public contactOptions:Observable<Contact[]>;// used by select contact form

  // for product
  private fbProductsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private productFormOptions =[]; // used by autocomplete product form
  private productFormOptionsFiltered: Observable<ProductId[]>; // used by autocomplete product form

  // for employe
  public fbEmployes: Observable<EmployeId[]>; // employes on firebase
  private fbEmployesSubscription : Subscription; // // then we can unsubscribe after having subscribe

  // for ServiceContract and global form
  public serviceContractForm;
  public pricesForm;
  public serviceContractId: string;
  private serviceContractDoc: AngularFirestoreDocument<ServiceContract>;
  private serviceContract: Observable<ServiceContract>;
  private serviceContractSubscription : Subscription;
  public serviceContractTypeParams = {path : "service-contracts", isArchived:'false', templateTitle:"Editer contrat en cours n° ", templateButton:"  archiver"}; // les paramètres liés au type de commande (archivées ou courantes)
  private indexNumeroInvoice:number;
  private indexQuotationServiceContract: number;

  // scanOrder File gestion
  downloadScanServiceContractURL: Observable<string>; // l'url de la photo sur firestorage (! ce n'est pas la référence)
  private scanServiceContractFile:File; //le fichier de la photo du produit à uploader
  private scanserviceContractPathToDeleteOnFirestorage:string; // le nom du fichier photo à supprimer sur Firestorage
  private bug:boolean = false;
  private serviceContractFormManager : ServiceContractFormManager;
  private pricesFormManager : PricesFormManager;

  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore, private fb: FormBuilder,
              private dialog: MatDialog, private storage: AngularFireStorage, private pdfService: PdfService,
              private computePriceService: ComputePriceService, private firebaseServices : FirebaseServices,
              private appComponent : AppComponent) {
    this.user = this.appComponent.user;
  }

  ngOnInit() {
    this.serviceContractFormManager = new ServiceContractFormManager();
    this.pricesFormManager = new PricesFormManager();
    this.setserviceContractTypeParams();
    this.serviceContractId = this.route.snapshot.paramMap.get('serviceContractId');
    this.initForm();
    this.observeServiceContract(this.serviceContractId);
    this.observeIndexNumeroInvoice();
    this._observeNumeroQuotationServiceContract();

    this.fbClientsSubscription = this.firebaseServices.getClients()
      .subscribe((clients) => {
        this.clientFormOptions = Array.from(clients);
        this.serviceContractForm.value.client.name !== undefined ? this.filterClients(this.serviceContractForm.value.client.name) : this.filterClients(this.serviceContractForm.value.client);
      });

    this.fbProductsSubscription = this.firebaseServices.getProducts()
      .subscribe( (products) => {
        this.productFormOptions = Array.from(products);
      });

    this.fbEmployes = this.firebaseServices.getEmployes();
    this.fbEmployesSubscription = this.fbEmployes.subscribe();
  }

  ngOnDestroy() {
    // unsubscribe to avoid memory leaks
    this.fbClientsSubscription.unsubscribe();
    this.fbProductsSubscription.unsubscribe();
    this.serviceContractSubscription.unsubscribe();
    this.fbEmployesSubscription.unsubscribe();
  }

  private observeIndexNumeroInvoice() {
    //console.log("observeIndexNumeroInvoice : ");
    this.db.doc<any>('parameters/numeroInvoice').valueChanges().subscribe(
      numeroInvoice => {
        this.indexNumeroInvoice = numeroInvoice.index;
        //console.log("observeIndexNumeroInvoiceSubscribe : ", this.indexNumeroInvoice);
      });
  }

  private _observeNumeroQuotationServiceContract() {
    this.db.doc<any>('parameters/numeroQuotationServiceContract').valueChanges().subscribe(
      numeroQuotationServiceContract => {
        this.indexQuotationServiceContract = numeroQuotationServiceContract.index;
      });
  }

  private setserviceContractTypeParams() {
    //console.log("setserviceContractTypeParams");
    if (this.route.snapshot.paramMap.get('archived')==="true") {
      this.serviceContractTypeParams.path='archived-service-contracts';
      this.serviceContractTypeParams.isArchived='true';
      this.serviceContractTypeParams.templateTitle= "Editer contrat de maintenance archivé n° ";
      this.serviceContractTypeParams.templateButton="  désarchiver"
    }
    else {
      this.serviceContractTypeParams.path='service-contracts';
      this.serviceContractTypeParams.isArchived='false';
      this.serviceContractTypeParams.templateTitle = "Editer contrat de maintenance en cours n° ";
      this.serviceContractTypeParams.templateButton="  archiver"
    }
  }

  private observeServiceContract(serviceContractId: string) {
    //console.log("observeServiceContract : " + serviceContractId);
    //this.serviceContract = this.db.doc<ServiceContract>(this.serviceContractTypeParams.path+'/'+serviceContractId).valueChanges().pipe(
    this.serviceContract = this.db.doc<any>(this.serviceContractTypeParams.path+'/'+serviceContractId).valueChanges().pipe(
      tap(serviceContract => {
        if (serviceContract != undefined) {
          //console.log("observe serviceContract :", serviceContract);
          // pour assurer la compatibilité avec les anciens contrats de maintenance
          if (serviceContract.tickets == undefined) {
            serviceContract.tickets=[{ticketElements: [{comment: ''}]}];
          }
          this.setSingleProducts(serviceContract.singleProduct.length);
          this.setCompositeProducts(serviceContract.compositeProducts);
          if (serviceContract.specialProduct) {
            this.setSpecialProducts(serviceContract.specialProduct.length);
          }
          this.setTickets(serviceContract.tickets);
          if (serviceContract.externalCosts !== undefined) { // pour assurer compatibilité commandes faites avant implémentation coûts externes
            this.setExternalCosts(serviceContract.externalCosts);
          }
          //console.log("serviceContract.orderDate (TimeStamp) : ", serviceContract.orderDate);
          this.serviceContractForm.patchValue(serviceContract);
          this.serviceContractFormManager.patchDates(serviceContract);
          if (serviceContract.scanOrder!='') {
            this.downloadScanServiceContractURL = this.storage.ref(serviceContract.scanOrder).getDownloadURL();} else {this.downloadScanServiceContractURL = undefined}
          this.setPrices();
        }
      })
    );
    this.serviceContractSubscription = this.serviceContract.subscribe( () => {});
  }

  /**
   * for autocomplete client form
   * fonction qui permet d'afficher dans le formulaire que le nom alors que c'est l'objet complet qui est sauvegardé
   */
  public displayClientFn(client?: ClientId): string | undefined {
    return client ? client.name : undefined;
  }

  /**
   * for autocomplete, filtre le client
   */
  private filterClients(clientP) {
    //console.log("filterClient", " / ", clientP);
    this.clientFilteredOptions = fromArray([this._filterClient(clientP)]);
    this.clientFilteredOptions.subscribe((client)=> {
        let contacts:Contact[];
        if (client[0]!=undefined && client[0].contacts !=undefined && client.length==1) {
          contacts = client[0].contacts;
        } else if (client[0]!=undefined && client[0].contacts !=undefined && client.length>1 && clientP.length>2) {
          for (let i=0; i<client.length; i++) {
            //console.log("client[i].name", client[i].name);
            if (client[i].name === clientP) {
              contacts = client[0].contacts;
              break;
            } else {contacts=[{contactEmail: "", contactName: "", contactFunction: "", contactPhone: "", contactCellPhone: ""}]}
          }
        } else {contacts=[{contactEmail: "", contactName: "", contactFunction: "", contactPhone: "", contactCellPhone: ""}]}
        this.contactOptions = fromArray([contacts]);
        this.contactOptions.subscribe();
        //console.log("contactOption : " , this.contactOptions);
      }
    )
  }

  private _filterClient(name: string): ClientId[] {
    const filterValue = name.toLowerCase();
    return this.clientFormOptions.filter(clientOption => clientOption.name.toLowerCase().indexOf(filterValue) === 0);
  }

  /* nécessaire pour mettre à jour dans le template au chargement de la page  le contact (car sinon angular ne siat pas sur quel champs comparer les objets) */
  public compareContactOptionFn(x: any, y: any): boolean {
    return x && y ? x.contactName === y.contactName : x === y;
  }

  /* nécessaire pour mettre à jour dans le template au chargement de la page l'employe (car sinon angular ne sait pas sur quel champs comparer les objets) */
  public compareEmployeOptionFn(x: any, y: any): boolean {
    return x && y ? x.name === y.name : x === y;
  }

  /* for automplete product form */
  public displayProductFn(product?: ProductId): string | undefined {
    return product ? product.name : undefined;
  }

  /* used for filter product*/
  public filterProducts(i, event: Event) {
    //console.log("filterProduct", i, " / ", (<HTMLInputElement>event.target).value);
    //console.log(this._filterProducts((<HTMLInputElement>event.target).value));
    this.productFormOptionsFiltered = fromArray([this._filterProducts((<HTMLInputElement>event.target).value)]);
  }

  private _filterProducts(value: string): ProductId[] {
    //console.log("value", value);
    const filterValue = value.toLowerCase();
    return this.productFormOptions.filter(productOption => productOption.name.toLowerCase().indexOf(filterValue) === 0);
  }

  /* used for add or remove single, composite and optionnal product*/
  private setSingleProducts(l) {
    while (this.singleProduct.length !== 1) {
      this.singleProduct.removeAt(1);
    }
    this.serviceContractForm.value.singleProductAmount = [1];
    for (let i=0; i<l-1; i++) {
      this.addSingleProduct();
    }
  }

  get singleProduct() {
    return this.serviceContractForm.get('singleProduct') as FormArray;
  }

  public addSingleProduct() {
    this.singleProduct.push(this.fb.control(''));
    this.serviceContractForm.value.singleProductAmount.push(1);
  }

  public rmSingleProduct(i) {
    //console.log("rmSingleProduct : "+i);
    this.singleProduct.removeAt(Number(i));
    this.serviceContractForm.value.singleProductAmount.splice(Number(i),1);
  }

  private setSingleProductAmount(index: number, value: string) {
    //console.log("serviceContractForm.singleProductAmount :", this.serviceContractForm.value);
    this.serviceContractForm.value.singleProductAmount[index] = Number(value);
    this.setPrices(); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  /* used for add or remove special product*/

  get specialProduct() {
    return this.serviceContractForm.get('specialProduct') as FormArray;
  }

  addSpecialProduct() {
    this.specialProduct.push(this.fb.control(''));
    this.serviceContractForm.value.specialProductPrice.push(0);
  }

  rmSpecialProduct(i) {
    this.specialProduct.removeAt(Number(i));
    this.serviceContractForm.value.specialProductPrice.splice(i, 1);
  }
  private setSpecialProductPrice(index: number, value: string) {
    //console.log("quotationForm.specialProductPrice:", this.quotationForm.value);
    this.serviceContractForm.value.specialProductPrice[index] = Number(value);
    this.pricesFormManager.setPrices(this.computePriceService.computePrices(this.serviceContractForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  setSpecialProducts(l) {
    while (this.specialProduct.length !== 1) {
      this.specialProduct.removeAt(1)
    }
    this.serviceContractForm.value.specialProductPrice = [0];
    for (let i=0; i<l-1; i++) {
      this.addSpecialProduct();
    }
  }


  /* used for add or remove composite product*/
  private setCompositeProducts(cpdt) {
    //console.log("setCompositeProducts ", cpdt);
    while (this.compositeProducts.length !== 0) {
      this.compositeProducts.removeAt(0)
    }
    for (let idxPdt=0; idxPdt<cpdt.length; idxPdt++) {
      this.addCompositeProduct();
      for (let i=0; i<cpdt[idxPdt].compositeProductElements.length-1; i++) {
        this.addCompositeProductElement(idxPdt);
      }
    }
  }

  get compositeProducts() {
    return this.serviceContractForm.get('compositeProducts') as FormArray;
  }

  public addCompositeProduct() {
    let element = this.fb.group({compositeProductElements: this.fb.array([this.fb.control('')])});
    this.compositeProducts.push(element);
    this.serviceContractForm.value.compositeProductAmount.push(1);
  }

  public rmCompositeProduct(i) {
    //console.log("rmCompositeProduct : "+i);
    this.compositeProducts.removeAt(Number(i));
    this.serviceContractForm.value.compositeProductAmount.splice(Number(i),1);
  }

  private setCompositeProductAmount(index: number, value: string) {
    //console.log("serviceContractForm.compositeProductAmount :", this.serviceContractForm.value);
    this.serviceContractForm.value.compositeProductAmount[index] = Number(value);
    this.setPrices(); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  public addCompositeProductElement(idxPdt) {
    //console.log('compositeProductElements before ', this.compositeProducts);
    let compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    this.compositeProducts.value[idxPdt] = compositePdts.push(this.fb.control(''));
    //console.log('compositeProductElements after ', this.compositeProducts);
  }

  public rmCompositeProductElement(idxPdt,i) {
    //console.log("rmCompositeProductElement : "+i);
    let compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    this.compositeProducts.value[idxPdt] = compositePdts.removeAt(Number(i));
  }

  /* Tickets */

  get tickets() {
    return this.serviceContractForm.get('tickets') as FormArray;
  }

  public addTicket() {
    let ticket = this.fb.group({ ticketElements: this.fb.array([this.fb.control( {comment: '', date : Timestamp.fromDate(new Date()), author: this.user.displayName})])});
    this.tickets.push(ticket);
  }

  public rmTicket(i) {
    //console.log("rmTicket : "+i);
    this.tickets.removeAt(Number(i));
  }

  public addTicketElement(idxPdt) {
    //console.log('addTicketElement before ', this.tickets);
    let ticketElements = this.tickets.controls[idxPdt].get('ticketElements') as FormArray;
    this.tickets.value[idxPdt] = ticketElements.push(this.fb.control({comment: '', date : Timestamp.fromDate(new Date()), author: this.user.displayName}));
    //console.log('addTicketElement after ', this.tickets);
  }

  public rmTicketElement(idxPdt,i) {
    //console.log("rmTicketElement : "+i);
    let ticketElements = this.tickets.controls[idxPdt].get('ticketElements') as FormArray;
    this.tickets.value[idxPdt] = ticketElements.removeAt(Number(i));
  }

  private setTickets(tickets) {
    //console.log("setTickets", tickets);
    while (this.tickets.length !== 0) {
      this.tickets.removeAt(0)
    }
    for (let idxTicket=0; idxTicket<tickets.length; idxTicket++) {
      this.addTicket();
      for (let i=0; i<tickets[idxTicket].ticketElements.length-1; i++) {
        this.addTicketElement(idxTicket);
      }
    }
  }

  public updateTicket(idxTicket, idxElt, comment) {
    //console.log("updateTicket ", comment);
    this.tickets.value[idxTicket].ticketElements[idxElt] = {comment: comment, date: Timestamp.fromDate(new Date()), author: this.user.displayName};
  }


  /* used for add or remove external costs*/
  get externalCosts() {
    return this.serviceContractForm.get('externalCosts') as FormArray;
  }

  public addExternalCost() {
    this.externalCosts.push(this.fb.control({ name : '', amount : 0 }));
  }

  public rmExternalCost(i) {
    this.externalCosts.removeAt(Number(i));
  }

  private setExternalCosts(externalCosts) {
    while (this.externalCosts.length !== 1) {
      this.externalCosts.removeAt(1)
    }
    for (let i = 1; i < externalCosts.length; i ++) {
      this.addExternalCost();
    }
  }

  private initForm() {
    this.serviceContractForm = this.serviceContractFormManager.getForm();
    this.serviceContractForm.valueChanges.subscribe(data => {
      //console.log('Form serviceContract changes', data);
      const prices = this.computePriceService.computePrices(data);
      this.pricesFormManager.setPrices(prices);
      this.serviceContractFormManager.setPaymentInvoice(prices);
      //console.log('Form serviceContract changes', data);
      data.client.name!=undefined ? this.filterClients(data.client.name) : this.filterClients(data.client);

    });
    this.pricesForm = this.pricesFormManager.getForm();
  }

  public wantUpdateServiceContract(isAskedByPdf, pdfType?:PdfType) {
    //console.log("wantUpdateServiceContract", this.serviceContractForm.value);
    this.controlForm(isAskedByPdf, pdfType);
  }

  private controlForm(isAskedByPdf, pdfType:PdfType) { // verify that client an products exists in database before save form
    let errorSource:string;
    if (this.serviceContractForm.value.client.id==undefined) {errorSource="client"}
    for (let i=0; i<this.serviceContractForm.value.singleProduct.length; i++) {if (this.serviceContractForm.value.singleProduct[i]!='' && this.serviceContractForm.value.singleProduct[i].id==undefined) {errorSource = "produit simple"}}
    for (let idxPdt=0; idxPdt<this.serviceContractForm.value.compositeProducts.length; idxPdt++) {
      for (let i=0; i<this.serviceContractForm.value.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (this.serviceContractForm.value.compositeProducts[idxPdt].compositeProductElements[i]!='' && this.serviceContractForm.value.compositeProducts[idxPdt].compositeProductElements[i].id==undefined) {errorSource="produit composé";}
      }
    }
    errorSource!=undefined? this.openFormErrorDialog(errorSource) : this.updateserviceContract(isAskedByPdf, pdfType);
  }

  private openFormErrorDialog(errorSource): void {
    const dialogRef = this.dialog.open(DialogDetailServiceContractOverview, {
      width: '450px',
      data: {message: "Le " + errorSource + " n'existe pas !"}
    });
    dialogRef.afterClosed().subscribe();
  }

  /**
   * save form in database as serviceContract
   * @param isAskedByPdf
   * @param pdfType
   */
  private updateserviceContract(isAskedByPdf, pdfType:PdfType) {
    //console.warn(this.serviceContractForm.value);

    if (this.scanserviceContractPathToDeleteOnFirestorage!=undefined) {this.deletePhotoOnFirestorage();}
    if (this.scanServiceContractFile!=undefined) {
      this.uploadFile(isAskedByPdf, pdfType);
    }
    else {
      this.serviceContractDoc = this.db.doc<ServiceContract>(this.serviceContractTypeParams.path+'/' + this.serviceContractId );
      this.serviceContractDoc.update(this.serviceContractForm.value).then( () => {
        if (isAskedByPdf) {
          this.pdfService.wantGeneratePdf(this.serviceContractForm.value, this.serviceContractId, pdfType);
        }
        else {
          this.openDialogMessage("La commande "+this.serviceContractId+" a été mise à jour.")
        }
      });
    }
  }

  private updateserviceContractAfterUploadFile(isAskedByPdf, pdfType:PdfType) {
    this.serviceContractForm.value.scanOrder=this.serviceContractTypeParams.path+'/'+this.scanServiceContractFile.name;
    this.serviceContractDoc = this.db.doc<ServiceContract>(this.serviceContractTypeParams.path+'/' + this.serviceContractId );
    this.serviceContractDoc.update(this.serviceContractForm.value).then(() => {
      if (isAskedByPdf) {
        this.pdfService.wantGeneratePdf(this.serviceContractForm.value, this.serviceContractId, pdfType);
      }
      else {
        this.openDialogMessage("La commande "+this.serviceContractId+" a été mise à jour.")
      }
      this.scanServiceContractFile=undefined;});
  }


  private openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogDetailServiceContractOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe();
  }

  private setPrices() {
    const prices = this.computePriceService.computePrices(this.serviceContractForm.value);
    this.pricesFormManager.setPrices(prices);
    this.serviceContractFormManager.setPaymentInvoice(prices);
  }

  /**
   * appel aux services pour générer les pdf
   */

  public wantGenerateAdvanceInvoicePdf() {
    if (typeof this.serviceContractForm.value.advanceRate !== "number" || this.serviceContractForm.value.advanceRate<=0 || this.serviceContractForm.value.advanceRate>100) {
      this.openDialogMessage("Vous devez spécifier un taux de facture acompte supérieur à zéro pour générer une facture d'acompte !");
    } else {
      this.controlAndSetAdvanceInvoiceDate();
      this.controlAndSetNumeroAdvanceInvoice();
      this.wantUpdateServiceContract(true, PdfType.advanceInvoice);
    }

  }

  public wantGenerateBalanceInvoicePdf() {
    if (this.serviceContractForm.value.balanceInvoiceDate===undefined || this.serviceContractForm.value.balanceInvoiceDate==='' || this.serviceContractForm.value.balanceInvoiceDate===null) {
      this.openDialogMessage("Vous devez spécifier une date pour la facture de solde !");
    } else if (this.serviceContractForm.value.advanceRate >= 100) {
      this.openDialogMessage("Le taux de facture d'acompte doit être inférieur à 100");
    } else {
      this.controlAndSetNumeroBalanceInvoice();
      this.wantUpdateServiceContract(true, PdfType.balanceInvoice);
    }
  }

  public wantGeneratePreparationReceiptPdf() {
    this.wantUpdateServiceContract(true, PdfType.preparationReceipt);
  }

  public wantGenerateDeliveryReceiptPdf() {
    this.wantUpdateServiceContract(true, PdfType.deliveryReceipt);
  }

  private controlAndSetAdvanceInvoiceDate() {
    if (this.serviceContractForm.value.advanceInvoiceDate===undefined || this.serviceContractForm.value.advanceInvoiceDate==='' || this.serviceContractForm.value.advanceInvoiceDate===null) {
      this.serviceContractForm.value.advanceInvoiceDate = new Date();
    }
  }

  private controlAndSetNumeroAdvanceInvoice() {
    if (this.serviceContractForm.value.numerosInvoice.advance === null) {
      this.serviceContractForm.value.numerosInvoice.advance = this.indexNumeroInvoice+1;
      this.db.collection('parameters').doc("numeroInvoice").update({index: this.indexNumeroInvoice + 1}).then(() => {});
    }
  }

  private controlAndSetNumeroBalanceInvoice() {
    if (this.serviceContractForm.value.numerosInvoice.balance === null) {
      this.serviceContractForm.value.numerosInvoice.balance = this.indexNumeroInvoice+1;
      this.db.collection('parameters').doc("numeroInvoice").update({index: this.indexNumeroInvoice + 1}).then(()=>{});
    }
  }

  public wantArchiveServiceContract() {
    //console.log("wantArchiveServiceContract");
    let message;
    this.serviceContractTypeParams.isArchived==="true" ? message ="Voulez-vous vraiment désarchiver le contrat de maintenance " : message = "Voulez-vous vraiment archiver le contrat de maintenance ";
    this.openDialogWantArchive(message + this.serviceContractId + " ?");
  }

  private openDialogWantArchive(message): void {
    const dialogRef = this.dialog.open(DialogDetailServiceContractOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      //console.log('The dialog was closed');
      if (result=='yes') {
        this.archiveServiceContract();
      }
    });
  }

  /**
   * save or sort serviceContract in database as archived serviceContract
   */
  private archiveServiceContract() {
    //console.log("archiveserviceContract");
    let newPath, oldPath, message;
    if (this.serviceContractTypeParams.isArchived==="true" ) {
      newPath = "service-contracts";
      oldPath = "archived-service-contracts";
      message = "Le contrat de maintenance a été replacé dans les contrats en cours sous le numéro "
    } else {
      newPath = "archived-service-contracts";
      oldPath = "service-contracts";
      message = "Le contrat de maintenance a été archivé sous le numéro "
    }
    this.db.collection(newPath).doc(this.serviceContractId).set(this.serviceContractForm.value).then(()=> {
      //console.log("new serviceContract written with ID: ", this.serviceContractId);
      this.serviceContractDoc = this.db.doc<ServiceContract>(oldPath+'/' + this.serviceContractId );
      this.serviceContractDoc.delete().then(()=> {
        this.openDialogArchive(message + this.serviceContractId)});
    });
  }

  private openDialogArchive(message): void {
    const dialogRef = this.dialog.open(DialogDetailServiceContractOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      //console.log('The dialog was closed');
      this.router.navigate(['list-service-contract/', {archived: this.serviceContractTypeParams.isArchived}]).then(()=>{});
    });
  }

  /**
   * scanOrder FILE GESTION
   */
  public updateScanServiceContract(event) {
    //todo deleteFileBefore
    this.scanServiceContractFile = event.target.files[0];
    //console.log("updateScanserviceContract :"+this.scanServiceContractFile.name);
    this.bug=false;
  }

  private uploadFile(isAskedByPdf, pdfType:PdfType) {
    //console.log("uploadFile :"+this.scanServiceContractFile.name);
    const fileRef = this.storage.ref(this.serviceContractTypeParams.path+'/'+this.scanServiceContractFile.name);
    // test si le fichier existe déjà
    fileRef.getDownloadURL().toPromise().then(
      () => { // le fichier existe
        this.openDialogMessage("Le fichier existe déjà, veuillez en utiliser un autre");
      },
      () => {// le fichier n'existe pas, on peut l'uploader
        //console.log("file doesn't exists");
        const fileRef = this.storage.ref(this.serviceContractTypeParams.path+'/'+this.scanServiceContractFile.name);
        const task = this.storage.upload(this.serviceContractTypeParams.path+'/'+this.scanServiceContractFile.name, this.scanServiceContractFile);
        // get notified when the download URL is available
        task.snapshotChanges().pipe(
          finalize(() => {
            this.downloadScanServiceContractURL = fileRef.getDownloadURL();
            this.updateserviceContractAfterUploadFile(isAskedByPdf, pdfType);
          } )
          )
          .subscribe()
      }
    );
  }

  public deleteScanServiceContract(inputFile) {
    //console.log("deleteScanServiceContract");
    inputFile.value='';
    this.scanServiceContractFile=undefined;
  }

  public wantDeleteScanServiceContractOnFirestorage() {
    //console.log("wantDeleteScanserviceContractOnFirestorage");
    // prepare delete scanOrder on storage when user save form
    this.downloadScanServiceContractURL=undefined;
    this.scanserviceContractPathToDeleteOnFirestorage=this.serviceContractForm.value.scanOrder;
    //console.log("wantDeleteScanserviceContractOnFirestorage : "+ this.scanserviceContractPathToDeleteOnFirestorage);
    this.serviceContractForm.value.scanOrder='';
    this.bug=true;
    //console.log(this.serviceContractForm.value);
  }

  private deletePhotoOnFirestorage() {
    //console.log("deletePhotoOnFirestorage"+this.scanserviceContractPathToDeleteOnFirestorage);
    this.storage.ref(this.scanserviceContractPathToDeleteOnFirestorage).delete();
    this.scanserviceContractPathToDeleteOnFirestorage=undefined;
  }

  /**
   * END scanOrder FILE GESTION
   */


  public wantDisplayOrGenerateQuotation() {
    if (this.serviceContractForm.value.forQuotationId !== undefined && this.serviceContractForm.value.forQuotationId !== '' && (this.serviceContractForm.value.forServiceContractId === '' || this.serviceContractForm.value.forServiceContractId === undefined)) {
      this.router.navigate(['quotation-service-contract/'+this.serviceContractForm.value.forQuotationId, {archived: this.serviceContractTypeParams.isArchived}]).then(()=>{});
    } else if (this.serviceContractForm.value.forServiceContractId !== undefined && this.serviceContractForm.value.forServiceContractId !== '') {
      this.router.navigate(['detail-service-contract/' + this.serviceContractForm.value.forServiceContractId, {archived: false}]).then(()=>{
        this.ngOnInit();
      });
    } else {
      let errorSource:string;
      if (this.serviceContractForm.value.client.id==undefined) {errorSource="client"}
      for (let i=0; i<this.serviceContractForm.value.singleProduct.length; i++) {if (this.serviceContractForm.value.singleProduct[i]!='' && this.serviceContractForm.value.singleProduct[i].id==undefined) {errorSource = "produit simple"}}
      for (let idxPdt=0; idxPdt<this.serviceContractForm.value.compositeProducts.length; idxPdt++) {
        for (let i=0; i<this.serviceContractForm.value.compositeProducts[idxPdt].compositeProductElements.length; i++) {
          if (this.serviceContractForm.value.compositeProducts[idxPdt].compositeProductElements[i]!='' && this.serviceContractForm.value.compositeProducts[idxPdt].compositeProductElements[i].id==undefined) {errorSource="produit composé";}
        }
      }
      errorSource!=undefined? this.openFormErrorDialog(errorSource) : this._wantGenerateQuotation();
    }

  }

  private _wantGenerateQuotation() {
    const dialogRef = this.dialog.open(DialogDetailServiceContractOverview, {
      width: '450px',
      data: {
        message: 'Voulez-vous générer un devis de renouvellement pour ce contrat ?',
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result=='yes') {
        this._generateQuotationServiceContract();
      }
    });
  }

  private _generateQuotationServiceContract() {
    const indexQuotationServiceContract = this.indexQuotationServiceContract + 1;
    this.serviceContractForm.value.forQuotationId = indexQuotationServiceContract.toString();
    this.serviceContractDoc = this.db.doc<ServiceContract>(this.serviceContractTypeParams.path+'/' + this.serviceContractId );
    this.serviceContractDoc.update(this.serviceContractForm.value).then(() => {
      this.serviceContractForm.value.quotationDate= Timestamp.now();
      this.serviceContractForm.value.fromServiceContractId = this.serviceContractId;
      if (this.serviceContractForm.value.rentDateTo instanceof Date) {
        this.serviceContractForm.value.rentDateFrom = this.serviceContractForm.value.rentDateTo;// par défaut date de début = date de fin du précédent contrat
      } else {
        this.serviceContractForm.value.rentDateFrom = Timestamp.now(); // ou par défaut date du jour
      }
      if (this.serviceContractForm.value.rentDateTo instanceof Date) {
        this.serviceContractForm.value.rentDateTo = Timestamp.fromMillis(this.serviceContractForm.value.rentDateTo.getTime() + 31536000000);// par défaut + 1 ans date de début du nouveau contrat
      } else {
        this.serviceContractForm.value.rentDateTo = Timestamp.fromMillis(  Timestamp.now().toMillis() + 31536000000);// par défaut + 1 ans date du jour
      }
      if ( this.serviceContractForm.value.immoDateTo instanceof Date) {
        this.serviceContractForm.value.immoDateFrom = this.serviceContractForm.value.immoDateTo;// par défaut date de début = date de fin du précédent contrat
      } else {
        this.serviceContractForm.value.immoDateFrom = Timestamp.now(); //ou par défaut date du jour
      }
      if (this.serviceContractForm.value.immoDateTo instanceof Date) {
        this.serviceContractForm.value.immoDateTo = Timestamp.fromMillis(this.serviceContractForm.value.immoDateTo.getTime() + 31536000000);// par défaut + 1 ans date de début du nouveau contrat
      } else {
        this.serviceContractForm.value.immoDateTo = Timestamp.fromMillis(Timestamp.now().toMillis() + 31536000000);// par défaut + 1 ans à la date du jour
      }
      this.db.collection('quotation-service-contracts').doc(indexQuotationServiceContract.toString()).set(this.serviceContractForm.value).then(() => {
        this.db.collection('parameters').doc("numeroQuotationServiceContract").update({index: indexQuotationServiceContract}).then(() => {
          this._dialogAfterQuotationGenerated("Le devis numéro " + indexQuotationServiceContract + " a été généré.", indexQuotationServiceContract)
        }).catch((error) => {
          this._dialogErrorQuotationGenerated(error);
        });
      })
        .catch((error) => {
          this._dialogErrorQuotationGenerated(error);
        });
      }).catch((error) => {
      this._dialogErrorQuotationGenerated(error);
    });
  }

  private _dialogAfterQuotationGenerated(message: string, id:number): void {
    const dialogRef = this.dialog.open(DialogDetailServiceContractOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['quotation-service-contract/'+id, {archived: this.serviceContractTypeParams.isArchived}]).then();
    });
  }

  private _dialogErrorQuotationGenerated(errorMessage: string): void {
    console.error("Error adding document: ", errorMessage);
    const dialogRef = this.dialog.open(DialogDetailServiceContractOverview, {
      width: '450px',
      data: {
        message: "erreur lors de la création du devis : " + errorMessage,
        displayNoButton:false
      }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['detail-service-contract/'+ this.serviceContractId, {archived: this.serviceContractTypeParams.isArchived}]).then();
    });
  }

}


@Component({
  selector: 'dialog-detail-service-contract-overview',
  templateUrl: 'dialog-detail-service-contract-overview.html',
})
export class DialogDetailServiceContractOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogDetailServiceContractOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogServiceContractData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
