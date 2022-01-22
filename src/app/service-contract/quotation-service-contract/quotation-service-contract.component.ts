import {Component, OnInit, Inject, Input} from '@angular/core';
import { Client } from '../../client/client';
import {Contact} from '../../client/contact';
import { Product } from '../../product/product';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators';
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
import {
  QuotationServiceContractFormManager,
} from "../../forms/quotationServiceContractFormManager";
import {PricesFormManager} from "../../forms/pricesFormManager";
import {FirebaseServices} from "../../common-services/firebaseServices";
import {AppComponent} from "../../app.component";
import {QuotationServiceContract} from "../quotation-service-contract";
import {DialogDetailQuotationOverview} from "../../quotation/detail-quotation/detail-quotation.component";
import {ServiceContract} from "../service-contract";

export interface ClientId extends Client { id: string; }
export interface ProductId extends Product { id: string; }
export interface EmployeId extends Employe { id: string; }
export interface DialogQuotationServiceContractData { message: string; displayNoButton:boolean; }

@Component({
  selector: 'app-quotation-service-contract',
  templateUrl: './quotation-service-contract.component.html',
  styleUrls: ['./quotation-service-contract.component.less']
})
export class QuotationServiceContractComponent implements OnInit {

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

  // for quotationServiceContract and global form
  public quotationServiceContractForm;
  public pricesForm;
  public quotationServiceContractId: string;
  private quotationServiceContractDoc: AngularFirestoreDocument<QuotationServiceContract>;
  private quotationServiceContract: Observable<QuotationServiceContract>;
  private quotationServiceContractSubscription : Subscription;
  public quotationServiceContractTypeParams = {path : "quotation-service-contracts", isArchived:'false', templateTitle:"Editer devis en cours n° ", templateButton:"  archiver"};
  private indexNumeroServiceContract:number;

  private quotationServiceContractFormManager : QuotationServiceContractFormManager;
  private pricesFormManager : PricesFormManager;
  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore, private fb: FormBuilder,
              private dialog: MatDialog, private storage: AngularFireStorage, private pdfService: PdfService,
              private computePriceService: ComputePriceService, private firebaseServices : FirebaseServices,
              private appComponent : AppComponent) {
    this.quotationServiceContractFormManager = new QuotationServiceContractFormManager();
    this.pricesFormManager = new PricesFormManager();
    this.setserviceContractTypeParams();
    this.user = this.appComponent.user;
  }

  ngOnInit() {
    this.quotationServiceContractId = this.route.snapshot.paramMap.get('quotationServiceContractId');
    this.initForm();
    this.observeQuotationServiceContract(this.quotationServiceContractId);
    this.observeIndexNumeroServiceContract();

    this.fbClientsSubscription = this.firebaseServices.getClients()
      .subscribe((clients) => {
        this.clientFormOptions = Array.from(clients);
        this.quotationServiceContractForm.value.client.name !== undefined ? this.filterClients(this.quotationServiceContractForm.value.client.name) : this.filterClients(this.quotationServiceContractForm.value.client);
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
    this.quotationServiceContractSubscription.unsubscribe();
    this.fbEmployesSubscription.unsubscribe();
  }

  private observeIndexNumeroServiceContract() {
    this.db.doc<any>('parameters/numeroServiceContract').valueChanges().subscribe(
      numeroServiceContract => {
        this.indexNumeroServiceContract = numeroServiceContract.index;
      });
  }

  private setserviceContractTypeParams() {
    //console.log("setserviceContractTypeParams");
    if (this.route.snapshot.paramMap.get('archived')==="true") {
      this.quotationServiceContractTypeParams.path='archived-quotation-service-contracts';
      this.quotationServiceContractTypeParams.isArchived='true';
      this.quotationServiceContractTypeParams.templateTitle= "Editer devis archivé n° ";
      this.quotationServiceContractTypeParams.templateButton="  désarchiver"
    }
    else {
      this.quotationServiceContractTypeParams.path='quotation-service-contracts';
      this.quotationServiceContractTypeParams.isArchived='false';
      this.quotationServiceContractTypeParams.templateTitle = "Editer devis en cours n° ";
      this.quotationServiceContractTypeParams.templateButton="  archiver"
    }
  }

  private observeQuotationServiceContract(quotationServiceContractId: string) {

    this.quotationServiceContract = this.db.doc<any>(this.quotationServiceContractTypeParams.path+'/'+quotationServiceContractId).valueChanges().pipe(
      tap(quotationServiceContract => {
        if (quotationServiceContract != undefined) {
          this.setSingleProducts(quotationServiceContract.singleProduct.length);
          this.setCompositeProducts(quotationServiceContract.compositeProducts);
          this.setSpecialProducts(quotationServiceContract.specialProduct.length);
          this.quotationServiceContractForm.patchValue(quotationServiceContract);
          this.quotationServiceContractFormManager.patchDates(quotationServiceContract);
          this.setPrices();
        }
      })
    );
    this.quotationServiceContractSubscription = this.quotationServiceContract.subscribe( () => {});
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

  /* nécessaire pour mettre à jour dans le template au chargement de la page  le contact (car sinon angular ne sait pas sur quel champs comparer les objets) */
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
    this.quotationServiceContractForm.value.singleProductAmount = [1];
    for (let i=0; i<l-1; i++) {
      this.addSingleProduct();
    }
  }

  get singleProduct() {
    return this.quotationServiceContractForm.get('singleProduct') as FormArray;
  }

  public addSingleProduct() {
    this.singleProduct.push(this.fb.control(''));
    this.quotationServiceContractForm.value.singleProductAmount.push(1);
  }

  public rmSingleProduct(i) {
    //console.log("rmSingleProduct : "+i);
    this.singleProduct.removeAt(Number(i));
    this.quotationServiceContractForm.value.singleProductAmount.splice(Number(i),1);
  }

  private setSingleProductAmount(index: number, value: string) {
    //console.log("quotationServiceContractForm.singleProductAmount :", this.quotationServiceContractForm.value);
    this.quotationServiceContractForm.value.singleProductAmount[index] = Number(value);
    this.setPrices(); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  /* used for add or remove special product*/

  get specialProduct() {
    return this.quotationServiceContractForm.get('specialProduct') as FormArray;
  }

  addSpecialProduct() {
    this.specialProduct.push(this.fb.control(''));
    this.quotationServiceContractForm.value.specialProductPrice.push(0);
  }

  rmSpecialProduct(i) {
    this.specialProduct.removeAt(Number(i));
    this.quotationServiceContractForm.value.specialProductPrice.splice(i, 1);
  }
  private setSpecialProductPrice(index: number, value: string) {
    //console.log("quotationForm.specialProductPrice:", this.quotationForm.value);
    this.quotationServiceContractForm.value.specialProductPrice[index] = Number(value);
    this.pricesFormManager.setPrices(this.computePriceService.computePrices(this.quotationServiceContractForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  setSpecialProducts(l) {
    while (this.specialProduct.length !== 1) {
      this.specialProduct.removeAt(1)
    }
    this.quotationServiceContractForm.value.specialProductPrice = [0];
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
    return this.quotationServiceContractForm.get('compositeProducts') as FormArray;
  }

  public addCompositeProduct() {
    let element = this.fb.group({compositeProductElements: this.fb.array([this.fb.control('')])});
    this.compositeProducts.push(element);
    this.quotationServiceContractForm.value.compositeProductAmount.push(1);
  }

  public rmCompositeProduct(i) {
    //console.log("rmCompositeProduct : "+i);
    this.compositeProducts.removeAt(Number(i));
    this.quotationServiceContractForm.value.compositeProductAmount.splice(Number(i),1);
  }

  private setCompositeProductAmount(index: number, value: string) {
    //console.log("quotationServiceContractForm.compositeProductAmount :", this.quotationServiceContractForm.value);
    this.quotationServiceContractForm.value.compositeProductAmount[index] = Number(value);
    this.setPrices(); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  public addCompositeProductElement(idxPdt) {
    let compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    this.compositeProducts.value[idxPdt] = compositePdts.push(this.fb.control(''));
  }

  public rmCompositeProductElement(idxPdt,i) {
    let compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    this.compositeProducts.value[idxPdt] = compositePdts.removeAt(Number(i));
  }


  private initForm() {
    this.quotationServiceContractForm = this.quotationServiceContractFormManager.getForm();
    this.quotationServiceContractForm.valueChanges.subscribe(data => {
      const prices = this.computePriceService.computePrices(data);
      this.pricesFormManager.setPrices(prices);
      data.client.name!=undefined ? this.filterClients(data.client.name) : this.filterClients(data.client);
    });
    this.pricesForm = this.pricesFormManager.getForm();
  }

  public wantUpdateForm(isAskedByPdf, pdfType?:PdfType) {
    let error = this._controlForm();
    error !== undefined? this.openFormErrorDialog(error) : this.updateserviceContract(isAskedByPdf, pdfType);
  }

  private _controlForm(): string | undefined { // verify that client an products exists in database before save form
    let errorSource:string;
    if (this.quotationServiceContractForm.value.client.id==undefined) {errorSource="client"}
    for (let i=0; i<this.quotationServiceContractForm.value.singleProduct.length; i++) {if (this.quotationServiceContractForm.value.singleProduct[i]!='' && this.quotationServiceContractForm.value.singleProduct[i].id==undefined) {errorSource = "produit simple"}}
    for (let idxPdt=0; idxPdt<this.quotationServiceContractForm.value.compositeProducts.length; idxPdt++) {
      for (let i=0; i<this.quotationServiceContractForm.value.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (this.quotationServiceContractForm.value.compositeProducts[idxPdt].compositeProductElements[i]!='' && this.quotationServiceContractForm.value.compositeProducts[idxPdt].compositeProductElements[i].id==undefined) {errorSource="produit composé";}
      }
    }
    return errorSource;
  }

  private openFormErrorDialog(errorSource): void {
    const dialogRef = this.dialog.open(DialogQuotationServiceContractOverview, {
      width: '450px',
      data: {message: "Le " + errorSource + " n'existe pas !"}
    });
    dialogRef.afterClosed().subscribe();
  }

  /**
   * save form in database as quotationServiceContract
   * @param isAskedByPdf
   * @param pdfType
   */
  private updateserviceContract(isAskedByPdf, pdfType:PdfType) {
    this.quotationServiceContractDoc = this.db.doc<QuotationServiceContract>(this.quotationServiceContractTypeParams.path+'/' + this.quotationServiceContractId );
    this.quotationServiceContractDoc.update(this.quotationServiceContractForm.value).then( () => {
      if (isAskedByPdf) {
        this.pdfService.wantGeneratePdf(this.quotationServiceContractForm.value, this.quotationServiceContractId, pdfType);
      }
      else {
        this.openDialogMessage("La commande "+this.quotationServiceContractId+" a été mise à jour.")
      }
    });
  }


  private openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogQuotationServiceContractOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe();
  }

  private setPrices() {
    const prices = this.computePriceService.computePrices(this.quotationServiceContractForm.value);
    this.pricesFormManager.setPrices(prices);
  }


  public wantArchiveQuotationServiceContract() {
    let message;
    this.quotationServiceContractTypeParams.isArchived==="true" ? message ="Voulez-vous vraiment désarchiver le devis de renouvellement du contrat de maintenance " : message = "Voulez-vous vraiment archiver le devis de renouvellement du contrat de maintenance ";
    this.openDialogWantArchive(message + this.quotationServiceContractId + " ?");
  }

  private openDialogWantArchive(message): void {
    const dialogRef = this.dialog.open(DialogQuotationServiceContractOverview, {
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
   * save or sort quotationServiceContract in database as archived quotationServiceContract
   */
  private archiveServiceContract() {
    //console.log("archiveserviceContract");
    let newPath, oldPath, message;
    if (this.quotationServiceContractTypeParams.isArchived==="true" ) {
      newPath = "quotation-service-contracts";
      oldPath = "archived-quotation-service-contracts";
      message = "Le devis de renouvellement du contrat de maintenance a été replacé dans les devis en cours sous le numéro "
    } else {
      newPath = "archived-quotation-service-contracts";
      oldPath = "quotation-service-contracts";
      message = "Le devis de renouvellement du contrat de maintenance a été archivé sous le numéro "
    }
    this.db.collection(newPath).doc(this.quotationServiceContractId).set(this.quotationServiceContractForm.value).then(()=> {
      //console.log("new quotationServiceContract written with ID: ", this.quotationServiceContractId);
      this.quotationServiceContractDoc = this.db.doc<QuotationServiceContract>(oldPath+'/' + this.quotationServiceContractId );
      this.quotationServiceContractDoc.delete().then(()=> {
        this.openDialogArchive(message + this.quotationServiceContractId)});
    });
  }

  private openDialogArchive(message): void {
    const dialogRef = this.dialog.open(DialogQuotationServiceContractOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['list-quotation-service-contract/', {archived: this.quotationServiceContractTypeParams.isArchived}]).then(()=>{});
    });
  }

  wantTransformQuotation() {
    this._openDialogWantTransform("Voulez-vous transformer le devis " +this.quotationServiceContractId+" en contrat de maintenance ?");
  }

  private _openDialogWantTransform(message): void {
    const dialogRef = this.dialog.open(DialogDetailQuotationOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result=='yes') {
        this._transformQuotation();
      }
    });
  }

  private _transformQuotation() { // save quotation in database as order then delete quotation
    this.quotationServiceContractForm.value.orderDate= new Date();
    this.quotationServiceContractForm.value.scanOrder="";
    this.quotationServiceContractForm.value.advanceInvoiceDate = '';
    this.quotationServiceContractForm.value.balanceInvoiceDate = '';
    this.quotationServiceContractForm.value.orderComment= '';
    this.quotationServiceContractForm.value.deliveryComment = '';
    this.quotationServiceContractForm.value.advanceRate=0;
    this.quotationServiceContractForm.value.numerosInvoice= {advance: null, balance : null};
    this.quotationServiceContractForm.value.credit=0;
    this.quotationServiceContractForm.value.fromQuotationId = this.quotationServiceContractId;
    const index = this.indexNumeroServiceContract+1;
    this.db.doc<any>('service-contracts/' + this.quotationServiceContractForm.value.fromServiceContractId).update({forServiceContractId: index})
      .then(() => {
        this.db.collection('service-contracts').doc(index.toString()).set(this.quotationServiceContractForm.value).then(()=> {
          this.db.collection('parameters').doc("numeroServiceContract").update({index: index}).then()
            .catch(error => this._dialogErrorTransformQuotation(error));
          this.quotationServiceContractDoc = this.db.doc<QuotationServiceContract>(this.quotationServiceContractTypeParams.path+'/' + this.quotationServiceContractId );
          this.quotationServiceContractDoc.delete().then(()=> {
            this.openDialogTransform("Le devis a été transformé en contrat de maintenance portant le numéro " + index, index)})
            .catch(error => this._dialogErrorTransformQuotation(error));
        })
          .catch((error) => {
            console.error("Error adding document: ", error);
            this._dialogErrorTransformQuotation(error)
          });
      });
  }

  openDialogTransform(message: string, index: number): void {
    const dialogRef = this.dialog.open(DialogDetailQuotationOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['detail-service-contract/'+ index, {archived: this.quotationServiceContractTypeParams.isArchived}]).then();
    });
  }

  private _dialogErrorTransformQuotation(errorMessage: string): void {
    console.error("Error adding document: ", errorMessage);
    const dialogRef = this.dialog.open(DialogQuotationServiceContractOverview, {
      width: '450px',
      data: {
        message: "erreur lors de la création du devis : " + errorMessage,
        displayNoButton:false
      }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['quotation-service-contract/'+ this.quotationServiceContractId, {archived: this.quotationServiceContractTypeParams.isArchived}]).then();
    });
  }

  public openDialogWantDelete(): void {
    const dialogRef = this.dialog.open(DialogQuotationServiceContractOverview, {
      width: '450px',
      data: {
        message: "Voulez-vous vraiment supprimer le devis n° " + this.quotationServiceContractId,
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result=='yes') {
        this.deleteQuotation();
      }
    });
  }

  deleteQuotation() { // delete quotation in database
    this.quotationServiceContractDoc = this.db.doc<QuotationServiceContract>(this.quotationServiceContractTypeParams.path+'/' + this.quotationServiceContractId );
    this.quotationServiceContractDoc.delete().then(() => {
      this.db.doc<any>('service-contracts/' + this.quotationServiceContractForm.value.fromServiceContractId).update({forQuotationId: ''})
        .then(() => {
          this._openDialogDeleted("Le devis "+this.quotationServiceContractId+" a été supprimé.")}
          ).catch(error => this._dialogError(error, "Erreur lors de la mise à jour du contrat de maintenance ayant servi à générer le devis."));
        })
        .catch(error => this._dialogError(error, "Erreur lors de la suppression du devis."));
  }

  private  _openDialogDeleted(message): void {
    const dialogRef = this.dialog.open(DialogQuotationServiceContractOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['list-quotation-service-contract/', {archived: this.quotationServiceContractTypeParams.isArchived}]).then();
    });
  }

  private _dialogError(error, message: string): void {
    console.error("Error: ", error);
    const dialogRef = this.dialog.open(DialogQuotationServiceContractOverview, {
      width: '450px',
      data: {
        message: message + " " + error,
        displayNoButton:false
      }
    });
    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['detail-service-contract/'+ this.quotationServiceContractId, {archived: this.quotationServiceContractTypeParams.isArchived}]).then();
    });
  }

  wantGenerateQuotationPdf() {
    this.wantUpdateForm(true, PdfType.quotation);
  }

}


@Component({
  selector: 'dialog-quotation-service-contract-overview',
  templateUrl: 'dialog-quotation-service-contract-overview.html',
})
export class DialogQuotationServiceContractOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogQuotationServiceContractOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogQuotationServiceContractData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
