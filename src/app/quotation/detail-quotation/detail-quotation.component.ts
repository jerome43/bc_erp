import { Component, OnInit, Inject } from '@angular/core';
import { Client } from '../../client/client';
import {Contact} from '../../client/contact';
import { Product } from '../../product/product';
import { Employe } from '../../employe/employe';
import { Quotation } from '../quotation';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators';
import {fromArray} from "rxjs/internal/observable/fromArray";
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormArray  } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs";
import {PdfService} from "../../pdf/pdf.service";
import {PdfType} from '../../pdf/pdf-type';
import {ComputePriceService} from "../../price/compute-price.service";
import { StockService } from '../../product/stock/stock.service';
import {ProductType} from "../../product/ProductType";
import {FirebaseServices} from "../../common-services/firebaseServices";
import {QuotationFormManager} from "../../forms/quotation-form-manager.service";
import {PricesFormManager} from "../../forms/pricesFormManager";

export interface ClientId extends Client { id: string; }
export interface ProductId extends Product { id: string; }
export interface EmployeId extends Employe { id: string; }
export interface DialogDetailQuotationData { message: string; displayNoButton:boolean; }

@Component({
  selector: 'app-detail-quotation',
  templateUrl: './detail-quotation.component.html',
  styleUrls: ['./detail-quotation.component.less']
})

export class DetailQuotationComponent implements OnInit {

  // for client
  private fbClientsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private clientFormOptions =[]; // used by autocomplete client form
  public clientFilteredOptions: Observable<ClientId[]>; // used by autocomplete client form

  // for contact
  public contactOptions:Observable<[Contact]>;// used by select contact form

  // for product
  private fbProductsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private productFormOptions =[]; // used by autocomplete product form
  private productFormOptionsFiltered: Observable<ProductId[]>; // used by autocomplete product form

  // for employe
  public fbEmployes: Observable<EmployeId[]>; // employes on firebase
  private fbEmployesSubscription : Subscription; // // then we can unsubscribe after having subscribe

  // the global form that will be store on firestore as quotation
  public quotationForm;
  public pricesForm;
  public quotationId: string;
  private quotationDoc: AngularFirestoreDocument<Quotation>;
  private quotation: Observable<Quotation>;
  private quotationSubscription : Subscription;
  public quotationTypeParams={path:"quotations", isArchived:'false', templateTitle:"Editer devis en cours n° ", templateButton:"  archiver"}; // les paramètres liés au type de devis (archivés ou courant)
  private numeroOrder:number;

  // stock gestion
  private productsImmoSubscription : Subscription; // subscription au tableau des stocks des produits de la commande

  private quotationFormManager : QuotationFormManager;
  private pricesFormManager : PricesFormManager;

  constructor( private router: Router, private route: ActivatedRoute, private db: AngularFirestore,
               private fb: FormBuilder, private dialog: MatDialog, private pdfService: PdfService,
               private computePriceService: ComputePriceService, private stockService: StockService,
               private firebaseServices : FirebaseServices ) {
    this.quotationFormManager = new QuotationFormManager();
    this.pricesFormManager = new PricesFormManager();
    this.setQuotationTypeParams();
  }

  ngOnInit() {
    // init the global form
    this.quotationId = this.route.snapshot.paramMap.get('quotationId');
    this.initForm();
    this.observeQuotation(this.quotationId);
    this.observeNumeroOrder();

    this.fbClientsSubscription = this.firebaseServices.getClients()
      .subscribe((clients) => {
        this.clientFormOptions = Array.from(clients);
        this.quotationForm.value.client.name !== undefined ? this.filterClients(this.quotationForm.value.client.name) : this.filterClients(this.quotationForm.value.client);
      });

    this.fbProductsSubscription = this.firebaseServices.getProducts()
      .subscribe( (products) => {
        this.productFormOptions = Array.from(products);
      });

    this.fbEmployes = this.firebaseServices.getEmployes();
    this.fbEmployesSubscription = this.fbEmployes.subscribe();

    this.productsImmoSubscription = this.stockService.getProductsImmo().subscribe(productsImmo => {
      if (productsImmo!=undefined) {this.testLackStock(productsImmo);}
    });
  }

  ngOnDestroy() {
    // unsubscribe to avoid memory leaks
    this.fbClientsSubscription.unsubscribe();
    this.fbProductsSubscription.unsubscribe();
    this.quotationSubscription.unsubscribe();
    this.productsImmoSubscription.unsubscribe();
    this.fbEmployesSubscription.unsubscribe();
  }

  /**
   * teste si le total des stocks sont suffisants
   * @param productsImmo
   */
  testLackStock(productsImmo) {
    //console.log("testLackStock");
    let products = this.quotationForm.value.singleProduct.slice(); // make a copy of the array
    //console.log("testLackStock products ", products);
    for (let idxPdt = 0; idxPdt < this.quotationForm.value.compositeProducts.length; idxPdt++) {
      products = products.concat(this.quotationForm.value.compositeProducts[idxPdt].compositeProductElements);
    }
    //console.log("testLackStock products ", products);

    let productsAmount = this.quotationForm.value.singleProductAmount.slice();
    for (let idxPdt = 0; idxPdt < this.quotationForm.value.compositeProducts.length; idxPdt++) {
      for (let i= 0; i< this.quotationForm.value.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        productsAmount.push(this.quotationForm.value.compositeProductAmount[idxPdt])
      }
    }
    //console.log("testLackStock products ", products, "testLackStock productsAmount ", productsAmount);

    products.forEach((product, idx)=>{
      if (product.type === ProductType.rental || product.type === ProductType.longRental) {
        let productImmo = productsImmo.filter(immo => immo.product.id === product.id && immo.isImmo === true && immo.orderId != this.quotationId);
        let quantityProductImmo = productsAmount[idx];
        //console.log("productsAmount[idx]", productsAmount[idx], " productImmo ", productImmo);
        for (let i = 0; i < productImmo.length; i++) {
          quantityProductImmo += productImmo[i].quantity;
          //console.log("quantityProductImmo : ", quantityProductImmo);
        }
        if (quantityProductImmo > product.stock) {
          this.openDialogMessage("Attention les stocks du produit " + product.name + " sont insuffisants. Commandes en conflit : " + productImmo.map(e => ["commande " + e.orderId + ' du ' + e.immoDateFrom.toDate().toLocaleDateString() + ' au ' + e.immoDateTo.toDate().toLocaleDateString() + ', quantité ' + e.quantity]).join("  /  "));
        }
      }
    });
  }

  observeNumeroOrder() {
    //console.log("observeNumeroOrder : ");
    this.db.doc<any>('parameters/numeroOrder').valueChanges().subscribe(
      numeroOrder => {
        this.numeroOrder = numeroOrder.index;
        //console.log("observeNumeroOrderSubscribe : ", this.numeroOrder);
      });
  }

  setQuotationTypeParams() {
    if (this.route.snapshot.paramMap.get('archived')==="true") {
      this.quotationTypeParams.path='archived-quotations';
      this.quotationTypeParams.isArchived='true';
      this.quotationTypeParams.templateTitle= "Editer devis archivé n° ";
      this.quotationTypeParams.templateButton="  désarchiver"
    }
    else {
      this.quotationTypeParams.path='quotations';
      this.quotationTypeParams.isArchived='false';
      this.quotationTypeParams.templateTitle = "Editer devis en cours n° ";
      this.quotationTypeParams.templateButton="  archiver"
    }
  }

  observeQuotation(quotationId: string) {
    //console.log("observeQuotation : "+quotationId);
    //this.quotation = this.db.doc<Quotation>(this.quotationTypeParams.path+'/'+quotationId).valueChanges().pipe(
    this.quotation = this.db.doc<any>(this.quotationTypeParams.path+'/'+quotationId).valueChanges().pipe(
      tap(quotation => {
        if (quotation != undefined) {
          //console.log("observe quotation :", quotation);

          // pour assurer la compatibilité avec les anciens devis fait avant les multiples  produits composés
          if (quotation.compositeProducts==undefined) {
            quotation.compositeProductAmount = [quotation.compositeProductAmount];
            quotation.compositeProducts=[{compositeProductElements: quotation.compositeProduct}];
          }
          this.setSingleProducts(quotation.singleProduct.length);
          this.setCompositeProducts(quotation.compositeProducts);
          this.setSpecialProducts(quotation.specialProduct.length);
          if (quotation.optionalProduct!=undefined && quotation.optionalProduct.length>0) {this.setOptionalProducts(quotation.optionalProduct.length);}
          //console.log("quotation.quotationDate (TimeStamp) : ", quotation.quotationDate);
          this.quotationForm.patchValue(quotation);
          this.quotationFormManager.patchDates(quotation);
          this.pricesFormManager.setPrices(this.computePriceService.computePrices(this.quotationForm.value));
          this.stockService.verifyStock(this.quotationForm.value.singleProduct, this.quotationForm.value.compositeProducts, this.quotationForm.value.immoDateFrom, this.quotationForm.value.immoDateTo, this.quotationId);
          //console.log("observe quotation quotationForm after patchValue  ", this.quotationForm.value)
        }
      })
    );
    this.quotationSubscription = this.quotation.subscribe();
  }

  /* for autocomplete client form */
  // fonction qui permet d'afficher dans le formulaire que le nom alors que c'est l'objet complet qui est sauvagardé
  displayClientFn(client?: ClientId): string | undefined {
    return client ? client.name : undefined;
  }

  // for autocmplete, filtre le client

  filterClients(clientP) {
    //console.log("filterClient", " / ", clientP);
    this.clientFilteredOptions = fromArray([this._filterClient(clientP)]);
    this.clientFilteredOptions.subscribe((client)=> {
        let contacts:[Contact];
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
      }
    )
  }

  private _filterClient(name: string): ClientId[] {
    const filterValue = name.toLowerCase();
    return this.clientFormOptions.filter(clientOption => clientOption.name.toLowerCase().indexOf(filterValue) === 0);
  }

  compareContactOptionFn(x: any, y: any): boolean { // nécessaire pour mettre à jour dans le template au chargement de la page le contact (car sinon angular ne sait pas sur quel champs comparer les objets)
    return x && y ? x.contactName === y.contactName : x === y;
  }

  compareEmployeOptionFn(x: any, y: any): boolean { // nécessaire pour mettre à jour dans le template au chargement de la page l'employe (car sinon angular ne sait pas sur quel champs comparer les objets)
    return x && y ? x.name === y.name : x === y;
  }


  /* for automplete product form */

  displayProductFn(product?: ProductId): string | undefined {
    return product ? product.name : undefined;
  }

  filterProducts(i, event: KeyboardEvent) {
    //console.log("filterProduct", i, " / ", (<HTMLInputElement>event.target).value);
    //console.log(this._filterProducts((<HTMLInputElement>event.target).value));
    this.productFormOptionsFiltered = fromArray([this._filterProducts((<HTMLInputElement>event.target).value)]);
  }

  private _filterProducts(value: string): ProductId[] {
    //console.log("value", value);
    const filterValue = value.toLowerCase();
    return this.productFormOptions.filter(productOption => productOption.name.toLowerCase().indexOf(filterValue) === 0);
  }

  /* used for add or remove single product*/

  setSingleProducts(l) {
    while (this.singleProduct.length !== 1) {
      this.singleProduct.removeAt(1)
    }
    this.quotationForm.value.singleProductAmount = [1];
    for (let i=0; i<l-1; i++) {
      this.addSingleProduct();
    }
  }

  get singleProduct() {
    return this.quotationForm.get('singleProduct') as FormArray;
  }

  addSingleProduct() {
    this.singleProduct.push(this.fb.control(''));
    this.quotationForm.value.singleProductAmount.push(1);
  }

  rmSingleProduct(i) {
    //console.log("rmContact : "+i);
    this.singleProduct.removeAt(Number(i));
    this.quotationForm.value.singleProductAmount.splice(Number(i),1);
  }

  private setSingleProductAmount(index: number, value: number) {
    //console.log("quotationForm.singleProductAmount :", this.quotationForm.value);
    this.quotationForm.value.singleProductAmount[index] = Number(value);
    this.pricesFormManager.setPrices(this.computePriceService.computePrices(this.quotationForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
    this.stockService.verifyStock(this.quotationForm.value.singleProduct, this.quotationForm.value.compositeProduct, this.quotationForm.value.immoDateFrom, this.quotationForm.value.immoDateTo, this.quotationId);// vérification des stocks (devrait être fait automatiquement par le subscribe du form : bug ?
  }


  /* used for add or remove special product*/

  get specialProduct() {
    return this.quotationForm.get('specialProduct') as FormArray;
  }

  addSpecialProduct() {
    this.specialProduct.push(this.fb.control(''));
  }

  rmSpecialProduct(i) {
    this.specialProduct.removeAt(Number(i));
  }
  private setSpecialProductPrice(index: number, value: number) {
    //console.log("quotationForm.specialProductPrice:", this.quotationForm.value);
    this.quotationForm.value.specialProductPrice[index] = Number(value);
    this.pricesFormManager.setPrices(this.computePriceService.computePrices(this.quotationForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  setSpecialProducts(l) {
    while (this.specialProduct.length !== 1) {
      this.specialProduct.removeAt(1)
    }
    this.quotationForm.value.specialProductPrice = [0];
    for (let i=0; i<l-1; i++) {
      this.addSpecialProduct();
    }
  }

  /* used for add or remove optionnal product*/

  setOptionalProducts(l) {
    while (this.optionalProduct.length !== 1) {
      this.optionalProduct.removeAt(1);
    }
    this.quotationForm.value.optionalProductAmount = [1];
    for (let i=0; i<l-1; i++) {
      this.addOptionalProduct();
    }
  }

  get optionalProduct() {
    return this.quotationForm.get('optionalProduct') as FormArray;
  }

  addOptionalProduct() {
    this.optionalProduct.push(this.fb.control(''));
    this.quotationForm.value.optionalProductAmount.push(1);
  }

  rmOptionalProduct(i) {
    //console.log("rmOptionalProduct : "+i);
    this.optionalProduct.removeAt(Number(i));
    this.quotationForm.value.optionalProductAmount.splice(Number(i),1);
  }

  private setOptionalProductAmount(index: number, value: number) {
    //console.log("quotationForm.optionalProductAmount :", this.quotationForm.value);
    this.quotationForm.value.optionalProductAmount[index] = Number(value);
  }

  /* used for add or remove composite product*/

  setCompositeProducts(cpdt) {
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
    return this.quotationForm.get('compositeProducts') as FormArray;
  }

  addCompositeProduct() {
    let element = this.fb.group({compositeProductElements: this.fb.array([this.fb.control('')])});
    this.compositeProducts.push(element);
    this.quotationForm.value.compositeProductAmount.push(1);
  }


  rmCompositeProduct(i) {
    //console.log("rmCompositeProduct : "+i);
    this.compositeProducts.removeAt(Number(i));
    this.quotationForm.value.compositeProductAmount.splice(Number(i),1);
  }


  private setCompositeProductAmount(index: number, value: number) {
    //console.log("quotationForm.compositeProductAmount :", this.quotationForm.value);
    this.quotationForm.value.compositeProductAmount[index] = Number(value);
    this.pricesFormManager.setPrices(this.computePriceService.computePrices(this.quotationForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }


  addCompositeProductElement(idxPdt) {
    //console.log('compositeProductElements before ', this.compositeProducts);
    let compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    this.compositeProducts.value[idxPdt] = compositePdts.push(this.fb.control(''));
    //console.log('compositeProductElements after ', this.compositeProducts);
  }

  rmCompositeProductElement(idxPdt,i) {
    //console.log("rmCompositeProductElement : "+i);
    let compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    this.compositeProducts.value[idxPdt] = compositePdts.removeAt(Number(i));
  }



  initForm() {
    this.quotationForm = this.quotationFormManager.getForm();
    this.quotationForm.valueChanges.subscribe(data => {
      //console.log('Form quotation changes', data);
      this.pricesFormManager.setPrices(this.computePriceService.computePrices(data));
      //console.log('Form quotation changes', data);
      data.client.name!=undefined ? this.filterClients(data.client.name) : this.filterClients(data.client);
    });

    this.pricesForm = this.pricesFormManager.getForm();
  }

  wantUpdateQuotation(isAskedByPdf, pdfType?:PdfType) {
    //console.log("wantUpdateQuotation", this.quotationForm.value);
    this.controlForm(isAskedByPdf, pdfType);
  }

  controlForm(isAskedByPdf, pdfType:PdfType) { // verify that client an products exists in database before save form
    let errorSource:string;
    if (this.quotationForm.value.client.id==undefined) {errorSource="client"}
    for (let i=0; i<this.quotationForm.value.singleProduct.length; i++) {if (this.quotationForm.value.singleProduct[i]!='' && this.quotationForm.value.singleProduct[i].id==undefined) {errorSource = "produit simple"}}
    for (let idxPdt=0; idxPdt<this.quotationForm.value.compositeProducts.length; idxPdt++) {
      for (let i=0; i<this.quotationForm.value.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (this.quotationForm.value.compositeProducts[idxPdt].compositeProductElements[i]!='' && this.quotationForm.value.compositeProducts[idxPdt].compositeProductElements[i].id==undefined) {errorSource="produit composé";}
      }
    }
    for (let i=0; i<this.quotationForm.value.optionalProduct.length; i++) {if (this.quotationForm.value.optionalProduct[i]!='' && this.quotationForm.value.optionalProduct[i].id==undefined) {errorSource="produit optionnel";}}
    errorSource!=undefined? this.openFormErrorDialog(errorSource) : this.updateQuotation(isAskedByPdf, pdfType);
  }

  openFormErrorDialog(errorSource): void {
    const dialogRef = this.dialog.open(DialogDetailQuotationOverview, {
      width: '450px',
      data: {message: "Le "+errorSource+ " n'existe pas !"}
    });
    dialogRef.afterClosed().subscribe();
  }

  updateQuotation(isAskedByPdf, pdfType:PdfType) { // save form in database as quotation
    //console.warn(this.quotationForm.value);
    this.quotationDoc = this.db.doc<Quotation>(this.quotationTypeParams.path+'/' + this.quotationId );
    this.quotationDoc.update(this.quotationForm.value).then( () => {
      if (isAskedByPdf) {
        this.pdfService.wantGeneratePdf(this.quotationForm.value, this.quotationId, pdfType);
      }
      else {
        this.openDialogMessage("Le devis "+  this.quotationId + " a été mise à jour.")
      }
    });
  }

  wantDeleteQuotation() {
    //console.warn("wantDeleteQuotation"+this.quotationId);
    this.openDialogWantDelete("Voulez-vous vraiment supprimer le devis "+this.quotationId+" ?");
  }

  deleteQuotation() { // delete quotation in database
    //console.warn("deleteQuotation"+this.quotationId);
    this.quotationDoc = this.db.doc<Quotation>(this.quotationTypeParams.path+'/' + this.quotationId );
    this.quotationDoc.delete().then( () => {
      this.openDialogDelete("Le devis "+this.quotationId+" a été supprimé.")});
  }

  openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogDetailQuotationOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe();
  }

  openDialogWantDelete(message): void {
    const dialogRef = this.dialog.open(DialogDetailQuotationOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      //console.log('The dialog was closed');
      if (result=='yes') {
        this.deleteQuotation();
      }
    });
  }

  openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogDetailQuotationOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['list-quotations/', {archived: this.quotationTypeParams.isArchived}]).then();
    });
  }

  wantTransformQuotation() {
    this.openDialogWantTransform("Voulez-vous vraiment transformer le devis " +this.quotationId+" en commande "+" ?");
  }

  openDialogWantTransform(message): void {
    const dialogRef = this.dialog.open(DialogDetailQuotationOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      //console.log('The dialog was closed');
      if (result=='yes') {
        this.transformQuotation();
      }
    });
  }

  transformQuotation() { // save quotation in database as order then delete quotation
    //console.log("transformQuotation ");
    // ajout des champs supplémentaires propres aux commandes
    this.quotationForm.value.orderDate= new Date();
    this.quotationForm.value.scanOrder="";
    this.quotationForm.value.advanceInvoiceDate = '';
    this.quotationForm.value.balanceInvoiceDate = '';
    this.quotationForm.value.orderComment= '';
    this.quotationForm.value.deliveryComment = '';
    this.quotationForm.value.advanceRate=40;
    this.quotationForm.value.numerosInvoice= {advance: null, balance : null};
    this.quotationForm.value.credit=0;
    this.quotationForm.value.quotationId = this.quotationId;
    const index = this.numeroOrder+1;

    this.db.collection('orders').doc(index.toString()).set(this.quotationForm.value).then(()=> {
      //console.log("Order written with ID: ", index);
      this.stockService.updateProductsStock(this.quotationForm.value.singleProduct, this.quotationForm.value.singleProductAmount, this.quotationForm.value.compositeProducts, this.quotationForm.value.compositeProductAmount, this.quotationForm.value.immoDateFrom, this.quotationForm.value.immoDateTo, index.toString());
      this.db.collection('parameters').doc("numeroOrder").update({index: index}).then();
      this.quotationDoc = this.db.doc<Quotation>(this.quotationTypeParams.path+'/' + this.quotationId );
      this.quotationDoc.delete().then(()=> {
        this.openDialogTransform("Le devis a été transformé en commande portant le numéro "+index)});
    })
      .catch(function(error) {
      console.error("Error adding document: ", error);
    });
  }

  openDialogTransform(message): void {
    const dialogRef = this.dialog.open(DialogDetailQuotationOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['list-quotations/', {archived: this.quotationTypeParams.isArchived}]).then();
    });
  }

  wantGenerateQuotationPdf() {
    this.wantUpdateQuotation(true, PdfType.quotation);
  }

  wantArchiveQuotation() {
    //console.log("wantArchiveQuotation");
    let message;
    this.quotationTypeParams.isArchived==="true" ? message ="Voulez-vous vraiment désarchiver le devis " : message = "Voulez-vous vraiment archiver le devis ";
    this.openDialogWantArchive(message +this.quotationId+" ?");
  }

  openDialogWantArchive(message): void {
    const dialogRef = this.dialog.open(DialogDetailQuotationOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      //console.log('The dialog was closed');
      if (result=='yes') {
        this.archiveQuotation();
      }
    });
  }

  archiveQuotation() { // save or sort quotation in database as archived quotation
    //console.log("archiveQuotation ");
    let newPath, oldPath, message;
    if (this.quotationTypeParams.isArchived==="true" ) {
      newPath = "quotations";
      oldPath = "archived-quotations";
      message = "Le devis a été remis dans les devis courant sous le numéro "
    }
    else {
      newPath = "archived-quotations";
      oldPath = "quotations";
      message = "Le devis a été archivé sous le numéro "
    }
    this.db.collection(newPath).doc(this.quotationId).set(this.quotationForm.value).then(()=> {
      //console.log("new quotation written with ID: ", this.quotationId);
      this.quotationDoc = this.db.doc<Quotation>(oldPath+'/' + this.quotationId );
      this.quotationDoc.delete().then(()=> {
        this.openDialogArchive(message + this.quotationId)});
    });
  }

  openDialogArchive(message): void {
    const dialogRef = this.dialog.open(DialogDetailQuotationOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['list-quotations/', {archived: this.quotationTypeParams.isArchived}]).then();
    });
  }

}


@Component({
  selector: 'dialog-detail-quotation-overview',
  templateUrl: 'dialog-detail-quotation-overview.html',
})
export class DialogDetailQuotationOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogDetailQuotationOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogDetailQuotationData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
