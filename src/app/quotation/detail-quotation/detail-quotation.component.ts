import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Client } from '../../client/client';
import {Contact} from '../../client/contact';
import { Product } from '../../product/product';
import { Employe } from '../../employe/employe';
import { Quotation } from '../quotation';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs'
import { tap, map, startWith } from 'rxjs/operators';
import {fromArray} from "rxjs/internal/observable/fromArray";
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Validators, FormGroup, FormControl, FormBuilder, FormArray  } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs/index";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
import {PdfService} from "../../pdf/pdf.service";
import {PdfType} from '../../pdf/pdf-type';
import {ComputePriceService} from "../../price/compute-price.service";
import { StockService } from '../../product/stock/stock.service';

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
  private fbClients: Observable<ClientId[]>; // clients on Firebase
  private fbClientsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private clientFormOptions =[]; // used by autocomplete client form
  private clientFilteredOptions: Observable<ClientId[]>; // used by autocomplete client form

  // for contact
  private contactOptions:Observable<[Contact]>;// used by select contact form

  // for product
  private fbProducts: Observable<ProductId[]>; // clients on Firebase
  private fbProductsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private productFormOptions =[]; // used by autocomplete product form
  private productFormOptionsFiltered: Observable<ProductId[]>; // used by autocomplete product form

  // for employe
  private fbEmployes: Observable<EmployeId[]>; // employes on firebase
  private fbEmployesSubscription : Subscription; // // then we can unsubscribe after having subscribe

  // the global form that will be store on firestore as quotation
  private detailQuotationForm;
  private detailQuotationPricesForm;
  private quotationId: string;
  private quotationDoc: AngularFirestoreDocument<Quotation>;
  private quotation: Observable<Quotation>;
  private quotationSubscription : Subscription;
  private quotationTypeParams={path:"quotations", isArchived:'false', templateTitle:"Editer devis en cours n° ", templateButton:"  archiver"}; // les paramètres liés au type de devis (archivés ou courant)
  private numeroOrder:number;

  // stock gestion
  private productsImmoSubscription : Subscription; // subscription au tableau des stocks des produits de la commande


  constructor( private router: Router, private route: ActivatedRoute, private db: AngularFirestore, private fb: FormBuilder, private dialog: MatDialog, private pdfService: PdfService, private computePriceService: ComputePriceService, private stockService: StockService) {

    this.setQuotationTypeParams(this.isArchived());

    // loading clients and update autocomplete client form
    this.fbClients = db.collection('clients').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Client;
        const name = data.name;
        const address = data.address;
        const zipcode = data.zipcode;
        const town = data.town;
        const country = data.country;
        const phone = data.phone;
        //const email = data.email;
        const contacts = data.contacts;
        const comment = data.comment;
        const discount = data.discount;
        const maintenance = data.maintenance;
        const date = data.date;
        const id = a.payload.doc.id;
        //this.clientFormOptions.push({id, name, address, zipcode, town, country, phone, email, contacts, comment, discount, maintenance, date});
        this.clientFormOptions.push({id, name, address, zipcode, town, country, phone, contacts, comment, discount, maintenance, date});
        return {id, ...data };
      })));

    // loading products and update autocomplete product form
    this.fbProducts = db.collection('products').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Product;
        const name = data.name;
        const description = data.description;
        //const serial_number = data.serial_number;
        const internal_number = data.internal_number;
        //const barcode = data.barcode;
        const stock = data.stock;
        const type = data.type;
        const sell_price = data.sell_price;
        const rent_price = data.rent_price;
        const apply_degressivity = data.apply_degressivity;
        const photo = data.photo;
        const comment = data.comment;
        const date = data.date;
        const id = a.payload.doc.id;
        //this.productFormOptions.push({id, name, description, serial_number, internal_number, barcode, stock, type, sell_price, rent_price, apply_degressivity, photo, comment, date});
        this.productFormOptions.push({id, name, description, internal_number, stock, type, sell_price, rent_price, apply_degressivity, photo, comment, date});
        return {id, ...data };
      })));

    // loading employes and update autocomplete employe form
    this.fbEmployes = db.collection('employes').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Employe;
        const id = a.payload.doc.id;
        return {id, ...data };
      })));

  }

  ngOnInit() {
    // init the global form
    this.quotationId = this.getQuotationId();
    this.initForm();
    this.observeQuotation(this.quotationId);
    this.observeNumeroOrder();

    // Call subscribe() to start listening for updates.
    this.fbClientsSubscription = this.fbClients.subscribe((clients)=>{ // subscribe to clients changes and then update contact form
      // console.log('Current clients: ', clients);
      this.detailQuotationForm.value.client.name!=undefined ? this.filterClients(this.detailQuotationForm.value.client.name) : this.filterClients(this.detailQuotationForm.value.client);// pour lancer le chargement de la liste des contact en fonction du client choisi au chargement de la page.
    });


    this.fbProductsSubscription = this.fbProducts.subscribe({ // subscribe to product change
      next(products) { console.log('Current products: ', products);},
      error(msg) { console.log('Error Getting products ', msg);},
      complete() {console.log('complete');
      }
    });

    this.productsImmoSubscription = this.stockService.getProductsImmo().subscribe(productsImmo => {
      if (productsImmo!=undefined) {this.testLackStock(productsImmo);}
    });

    // Call subscribe() to start listening for updates.
    this.fbEmployesSubscription = this.fbEmployes.subscribe((employes)=>{ // subscribe to employes changes and then update contact form
      console.log('Current employes: ', employes);
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

  testLackStock(productsImmo) { // teste si le total des stocks sont suffisants

    var products = this.detailQuotationForm.value.singleProduct.concat(this.detailQuotationForm.value.compositeProduct);
    var productsAmount = this.detailQuotationForm.value.singleProductAmount.concat(this.detailQuotationForm.value.compositeProductAmount);
    for (var i = 2; i<=this.detailQuotationForm.value.compositeProduct.length; i++) {productsAmount.push(this.detailQuotationForm.value.compositeProductAmount)}
    console.log("testLackStock : ", products, ' / ', productsAmount);

    products.forEach((product, idx)=>{
      if (product.type==="rental") {
        var productImmo = productsImmo.filter(immo => immo.product.id === product.id && immo.isImmo === true && immo.orderId != this.quotationId);
        var quantityProductImmo = productsAmount[idx];
        console.log("productsAmount[idx]", productsAmount[idx], " productImmo ", productImmo);
        for (var i = 0; i < productImmo.length; i++) {
          quantityProductImmo += productImmo[i].quantity;
          console.log("quantityProductImmo : ", quantityProductImmo);
        }
        if (quantityProductImmo > product.stock) {
          this.openDialogMessage("Attention les stocks du produit " + product.name + " sont insuffisants. Commandes en conflit : " + productImmo.map(e => ["commande " + e.orderId + ' du ' + e.immoDateFrom.toDate().toLocaleDateString() + ' au ' + e.immoDateTo.toDate().toLocaleDateString() + ', quantité ' + e.quantity]).join("  /  "));
        }
      }
    });
  }

  observeNumeroOrder() {
    console.log("observeNumeroOrder : ");
    this.db.doc<any>('parameters/numeroOrder').valueChanges().subscribe(
      numeroOrder => {
        this.numeroOrder = numeroOrder.index;
        console.log("observeNumeroOrderSubscribe : ", this.numeroOrder);
      });
  }

  isArchived(): boolean {
    var isArchived;
    this.route.snapshot.paramMap.get('archived')==="true" ? isArchived = true : isArchived = false;
    return isArchived;
  }

  setQuotationTypeParams(isArchived:boolean) {
    console.log("isArchived :" + isArchived);
    if (isArchived) {
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

  getQuotationId(): string {
    return this.route.snapshot.paramMap.get('quotationId');
  }

  observeQuotation(quotationId: string) {
    console.log("observeQuotation : "+quotationId);
    this.quotation = this.db.doc<Quotation>(this.quotationTypeParams.path+'/'+quotationId).valueChanges().pipe(
      tap(quotation => {
        if (quotation != undefined) {
          console.log("observe quotation :", quotation);
          this.setSingleProducts(quotation.singleProduct.length);
          this.setCompositeProducts(quotation.compositeProduct.length);
          this.setSpecialProducts(quotation.specialProduct.length);
          console.log("quotation.quotationDate (TimeStamp) : ", quotation.quotationDate);
          this.detailQuotationForm.patchValue(quotation);
          // convert from TimeStamp (saved in firebase) to Date (used by angular DatePicker)
          if (quotation.rentDateFrom instanceof Timestamp) {this.detailQuotationForm.controls['rentDateFrom'].patchValue(quotation.rentDateFrom.toDate())}
          if (quotation.rentDateTo instanceof Timestamp) {this.detailQuotationForm.controls['rentDateTo'].patchValue(quotation.rentDateTo.toDate())}
          if (quotation.immoDateFrom instanceof Timestamp) {this.detailQuotationForm.controls['immoDateFrom'].patchValue(quotation.immoDateFrom.toDate())}
          if (quotation.immoDateTo instanceof Timestamp) {this.detailQuotationForm.controls['immoDateTo'].patchValue(quotation.immoDateTo.toDate())}
          if (quotation.quotationDate instanceof Timestamp) {this.detailQuotationForm.controls['quotationDate'].patchValue(quotation.quotationDate.toDate())}
          if (quotation.relaunchClientDate instanceof Timestamp) {this.detailQuotationForm.controls['relaunchClientDate'].patchValue(quotation.relaunchClientDate.toDate())}
          if (quotation.installationDate instanceof Timestamp) {this.detailQuotationForm.controls['installationDate'].patchValue(quotation.installationDate.toDate())}
          //this.computePrices();
          this.setPrice(this.computePriceService.computePrices(this.detailQuotationForm.value));
          // alternative solution
          //const timestamp = quotation.quotationDate.seconds*1000;
          //quotation.quotationDate = new Date(timestamp);
          this.stockService.verifyStock(this.detailQuotationForm.value.singleProduct.concat(this.detailQuotationForm.value.compositeProduct), this.detailQuotationForm.value.immoDateFrom, this.detailQuotationForm.value.immoDateTo, this.quotationId);
          console.log("observe quotation detailQuotationForm after patchValue  ", this.detailQuotationForm.value)
        }
      })
    );
    this.quotationSubscription = this.quotation.subscribe(
      quotation => {
      }
      /*{
      next(quotation) { console.log('Current quotations ', quotation); },
      error(msg) { console.log('Error Getting quotation ', msg);},
      complete() {console.log('complete')}
    }
    */);
  }


  /* for autocomplete client form */
  // fonction qui permet d'afficher dans le formulaire que le nom alors que c'est l'objet complet qui est sauvagardé
  displayClientFn(client?: ClientId): string | undefined {
    return client ? client.name : undefined;
  }

  // for autocmplete, filtre le client

  filterClients(clientP) {
    console.log("filterClient", " / ", clientP);
    this.clientFilteredOptions = fromArray([this._filterClient(clientP)]);
    this.clientFilteredOptions.subscribe((client)=> {
      console.log("filterClient / client : ", client);
        var contacts:[Contact];
        if (client[0]!=undefined && client[0].contacts !=undefined && client.length==1) {// si longueur >1, c'est qu'il y a plusieurs résultats de clients possible, donc on ne charge pas de contacts
          contacts = client[0].contacts;
        }
        else {contacts=[{contactEmail: "", contactName: "", contactFunction: "", contactPhone: "", contactCellPhone: ""}]}
        this.contactOptions = fromArray([contacts]);
        this.contactOptions.subscribe((contacts) =>{console.log("contacts", contacts);});
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

  /* used for add or remove single product*/

  setSingleProducts(l) {
    while (this.singleProduct.length !== 1) {
      this.singleProduct.removeAt(1)
    }
    this.detailQuotationForm.value.singleProductAmount = [1];
    for (var i=0; i<l-1; i++) {
      this.addSingleProduct();
    }
  }

  get singleProduct() {
    return this.detailQuotationForm.get('singleProduct') as FormArray;
  }

  addSingleProduct() {
    this.singleProduct.push(this.fb.control(''));
    this.detailQuotationForm.value.singleProductAmount.push(1);
  }

  rmSingleProduct(i) {
    console.log("rmContact : "+i);
    this.singleProduct.removeAt(Number(i));
    this.detailQuotationForm.value.singleProductAmount.splice(Number(i),1);
  }

  filterProducts(i, event: KeyboardEvent) {
    console.log("filterProduct", i, " / ", (<HTMLInputElement>event.target).value);
    console.log(this._filterProducts((<HTMLInputElement>event.target).value));
    this.productFormOptionsFiltered = fromArray([this._filterProducts((<HTMLInputElement>event.target).value)]);
  }

  private _filterProducts(value: string): ProductId[] {
    console.log("value", value);
    const filterValue = value.toLowerCase();
    return this.productFormOptions.filter(productOption => productOption.name.toLowerCase().indexOf(filterValue) === 0);
  }

  private setSingleProductAmount(index: number, value: number) {
    console.log("detailQuotationForm.singleProductAmount :", this.detailQuotationForm.value);
    this.detailQuotationForm.value.singleProductAmount[index] = Number(value);
    //this.computePrices(); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
    this.setPrice(this.computePriceService.computePrices(this.detailQuotationForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
    this.stockService.verifyStock(this.detailQuotationForm.value.singleProduct.concat(this.detailQuotationForm.value.compositeProduct), this.detailQuotationForm.value.immoDateFrom, this.detailQuotationForm.value.immoDateTo, this.quotationId);// vérification des stocks (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  setCompositeProducts(l) {
    while (this.compositeProduct.length !== 1) {
      this.compositeProduct.removeAt(1)
    }
    for (var i=0; i<l-1; i++) {
      this.addCompositeProduct();
    }
  }

  get compositeProduct() {
    return this.detailQuotationForm.get('compositeProduct') as FormArray;
  }

  addCompositeProduct() {
    this.compositeProduct.push(this.fb.control(''));
  }

  rmCompositeProduct(i) {
    //console.log("rmContact : "+i);
    this.compositeProduct.removeAt(Number(i));
  }

  get specialProduct() {
    return this.detailQuotationForm.get('specialProduct') as FormArray;
  }

  addSpecialProduct() {
    this.specialProduct.push(this.fb.control(''));
  }

  rmSpecialProduct(i) {
    this.specialProduct.removeAt(Number(i));
  }
  private setSpecialProductPrice(index: number, value: number) {
    console.log("detailQuotationForm.specialProductPrice:", this.detailQuotationForm.value);
    this.detailQuotationForm.value.specialProductPrice[index] = Number(value);
    this.setPrice(this.computePriceService.computePrices(this.detailQuotationForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  setSpecialProducts(l) {
    while (this.specialProduct.length !== 1) {
      this.specialProduct.removeAt(1)
    }
    this.detailQuotationForm.value.specialProductPrice = [0];
    for (var i=0; i<l-1; i++) {
      this.addSpecialProduct();
    }
  }


  initForm() {
    this.detailQuotationForm = this.fb.group({
      client: ['', Validators.required],
      contact: [{
        contactName : "",
        contactFunction : "",
        contactPhone : "",
        contactCellPhone : "",
        contactEmail : "",
      }],
      employe: [{
        name: "",
        address: "",
        zipcode: "",
        town: "",
        phone: "",
        cellPhone: "",
        email: "",
        date: "",
      }],
      singleProductAmount: [[1]],
      singleProduct: this.fb.array([
        this.fb.control('')
      ]),
      compositeProduct: this.fb.array([
        this.fb.control('')
      ]),
      compositeProductAmount: [1],
      specialProduct: this.fb.array([
        this.fb.control('')
      ]),
      specialProductPrice: [[0]],
      rentDateFrom: [''],
      rentDateTo: [''],
      immoDateFrom: [''],
      immoDateTo: [''],
      quotationComment: [''],
      privateQuotationComment: [''],
      quotationDate: ['', Validators.required],
      relaunchClientDate:[''],
      installationAddress: [''],
      installationZipcode: [''],
      installationTown: [''],
      installationDate: [''],
      installationHours: [''],
      installationContactName: [''],
      installationContactPhone: [''],
    });
    this.detailQuotationForm.valueChanges.subscribe(data => {
      console.log('Form quotation changes', data);
      //this.computePrices();
      this.setPrice(this.computePriceService.computePrices(data));
      console.log('Form quotation changes', data);
      data.client.name!=undefined ? this.filterClients(data.client.name) : this.filterClients(data.client);
    });
    this.detailQuotationPricesForm = this.fb.group({
      price: [0],
      discount: [0],
      discountPrice: [0],
    });
  }

  wantUpdateQuotation(isAskedByPdf, pdfType:PdfType) {
    console.log("wantUpdateQuotation", this.detailQuotationForm.value);
    this.controlForm(isAskedByPdf, pdfType);
  }

  controlForm(isAskedByPdf, pdfType:PdfType) { // verify that client an products exists in database before save form
    var errorSource:string;
    if (this.detailQuotationForm.value.client.id==undefined) {errorSource="client"}
    for (var i=0; i<this.detailQuotationForm.value.singleProduct.length; i++) {if (this.detailQuotationForm.value.singleProduct[i]!='' && this.detailQuotationForm.value.singleProduct[i].id==undefined) {errorSource = "produit simple"}}
    for (var i=0; i<this.detailQuotationForm.value.compositeProduct.length; i++) {if (this.detailQuotationForm.value.compositeProduct[i]!='' && this.detailQuotationForm.value.compositeProduct[i].id==undefined) {errorSource="produit composé";}}
    errorSource!=undefined? this.openFormErrorDialog(errorSource) : this.updateQuotation(isAskedByPdf, pdfType);
  }

  openFormErrorDialog(errorSource): void {
    const dialogRef = this.dialog.open(DialogDetailQuotationOverview, {
      width: '450px',
      data: {message: "Le "+errorSource+ " n'existe pas !"}
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }

  updateQuotation(isAskedByPdf, pdfType:PdfType) { // save form in database as quotation
    console.warn(this.detailQuotationForm.value);
    this.quotationDoc = this.db.doc<Quotation>(this.quotationTypeParams.path+'/' + this.quotationId );
    this.quotationDoc.update(this.detailQuotationForm.value).then(data => {
      if (isAskedByPdf) {
        this.pdfService.wantGeneratePdf(this.detailQuotationForm.value, this.quotationId, pdfType);
      }
      else {
        this.openDialogMessage("Le devis "+  this.quotationId + " a été mise à jour.")
      }
    });
  }


  wantDeleteQuotation() {
    console.warn("wantDeleteQuotation"+this.quotationId);
    this.openDialogWantDelete("Voulez-vous vraiment supprimer le devis "+this.quotationId+" ?");
  }

  deleteQuotation() { // delete quotation in database
    console.warn("deleteQuotation"+this.quotationId);
    this.quotationDoc = this.db.doc<Quotation>(this.quotationTypeParams.path+'/' + this.quotationId );
    this.quotationDoc.delete().then(data => {
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

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
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
      console.log('The dialog was closed');
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

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.router.navigate(['list-quotations/', {archived: this.quotationTypeParams.isArchived}]);
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
      console.log('The dialog was closed');
      if (result=='yes') {
        this.transformQuotation();
      }
    });
  }

  transformQuotation() { // save quotation in database as order then delete quotation
    console.log("transformQuotation ");
    // ajout des champs supplémentaires propres aux commandes
    this.detailQuotationForm.value.orderDate= new Date();
    this.detailQuotationForm.value.scanOrder="";
    this.detailQuotationForm.value.balanceInvoiceDate = '';
    this.detailQuotationForm.value.orderComment= '';
    this.detailQuotationForm.value.deliveryComment = '';
    this.detailQuotationForm.value.advanceRate=40;
    this.detailQuotationForm.value.numerosInvoice= {advance: null, balance : null};
    this.detailQuotationForm.value.credit=0;
    const index = this.numeroOrder+1;

    this.db.collection('orders').doc(index.toString()).set(this.detailQuotationForm.value).then(()=> {
      console.log("Order written with ID: ", index);
      this.stockService.updateProductsStock(this.detailQuotationForm.value.singleProduct, this.detailQuotationForm.value.singleProductAmount, this.detailQuotationForm.value.compositeProduct, this.detailQuotationForm.value.compositeProductAmount, this.detailQuotationForm.value.immoDateFrom, this.detailQuotationForm.value.immoDateTo, index.toString());
      this.db.collection('parameters').doc("numeroOrder").update({index: index});
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

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.router.navigate(['list-quotations/', {archived: this.quotationTypeParams.isArchived}]);
    });
  }

  setPrice(prices) {
    this.detailQuotationPricesForm.value.price = prices.price;
    this.detailQuotationPricesForm.value.discount= prices.discount;
    //this.detailQuotationPricesForm.value.discountPrice = prices.price - prices.price*prices.discount/100;
    this.detailQuotationPricesForm.value.discountPrice = prices.discountPrice;
  }

  wantGenerateQuotationPdf() {
    this.wantUpdateQuotation(true, PdfType.quotation);
  }

  wantArchiveQuotation() {
    console.log("wantArchiveQuotation");
    var message;
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
      console.log('The dialog was closed');
      if (result=='yes') {
        this.archiveQuotation();
      }
    });
  }

  archiveQuotation() { // save or sort quotation in database as archived quotation
    console.log("archiveQuotation ");
    var newPath, oldPath, message;
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
    this.db.collection(newPath).doc(this.quotationId).set(this.detailQuotationForm.value).then(()=> {
      console.log("new quotation written with ID: ", this.quotationId);
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

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.router.navigate(['list-quotations/', {archived: this.quotationTypeParams.isArchived}]);
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
