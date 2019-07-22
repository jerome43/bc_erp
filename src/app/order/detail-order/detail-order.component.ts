import { Component, OnInit, OnDestroy, Inject, ViewChild, ElementRef } from '@angular/core';
import { Client } from '../../client/client';
import {Contact} from '../../client/contact';
import { Product } from '../../product/product';
import { Order } from '../order';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs'
import { tap, map, startWith, finalize } from 'rxjs/operators';
import {fromArray} from "rxjs/internal/observable/fromArray";
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Validators, FormGroup, FormControl, FormBuilder, FormArray  } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs/index";
import {firestore} from 'firebase/app';
import { AngularFireStorage } from '@angular/fire/storage';
import Timestamp = firestore.Timestamp;
import {PdfService} from "../../pdf/pdf.service";
import {PdfType} from '../../pdf/pdf-type';
import {ComputePriceService} from "../../price/compute-price.service";
import { StockService } from '../../product/stock/stock.service';
import {Employe} from "../../employe/employe";

export interface ClientId extends Client { id: string; }
export interface ProductId extends Product { id: string; }
export interface EmployeId extends Employe { id: string; }
export interface DialogDetailOrderData { message: string; displayNoButton:boolean; }

@Component({
  selector: 'app-detail-order',
  templateUrl: './detail-order.component.html',
  styleUrls: ['./detail-order.component.less']
})
export class DetailOrderComponent implements OnInit {

  // for client
  fbClients: Observable<ClientId[]>; // clients on Firebase
  private fbClientsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private clientFormOptions =[]; // used by autoocmplete client form
  clientFilteredOptions: Observable<ClientId[]>; // used by autocomplete client form

  // for contact
  contactOptions:Observable<[Contact]>;// used by select contact form

  // for product
  private fbProducts: Observable<ProductId[]>; // clients on Firebase
  private fbProductsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private productFormOptions =[]; // used by autocomplete product form
  private productFormOptionsFiltered: Observable<ProductId[]>; // used by autocomplete product form

  // for employe
  fbEmployes: Observable<EmployeId[]>; // employes on firebase
  private fbEmployesSubscription : Subscription; // // then we can unsubscribe after having subscribe

  // for order and global form
  detailOrderForm;
  detailOrderPricesForm;
  orderId: string;
  private orderDoc: AngularFirestoreDocument<Order>;
  private order: Observable<Order>;
  private orderSubscription : Subscription;
  orderTypeParams={path : "orders", isArchived:'false', templateTitle:"Editer commande en cours n° ", templateButton:"  archiver"}; // les paramètres liés au type de commande (archivées ou courantes)
  private indexNumeroInvoice:number;

  // scanOrder File gestion
  downloadScanOrderURL: Observable<string>; // l'url de la photo sur firestorage (! ce n'est pas la référence)
  private scanOrderFile:File; //le fichier de la photo du produit à uploader
  private scanOrderPathToDeleteOnFirestorage:string; // le nom du fichier photo à supprimer sur Firestorage
  private bug:boolean = false;

  // stock gestion
  private productsImmoSubscription : Subscription; // subscription au tableau des stocks des produits de la commande

  constructor( private router: Router, private route: ActivatedRoute, private db: AngularFirestore, private fb: FormBuilder, private dialog: MatDialog, private storage: AngularFireStorage, private pdfService: PdfService, private computePriceService: ComputePriceService, private stockService: StockService) {

    this.setOrderTypeParams(this.isArchived());

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
        const rentalDiscount = data.rentalDiscount;
        const saleDiscount = data.saleDiscount;
        const maintenance = data.maintenance;
        const date = data.date;
        const id = a.payload.doc.id;
        this.clientFormOptions.push({id, name, address, zipcode, town, country, phone, contacts, comment, rentalDiscount, saleDiscount, maintenance, date});
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
    this.orderId = this.getOrderId();
    this.initForm();
    this.observeOrder(this.orderId);
    this.observeIndexNumeroInvoice();

    // Call subscribe() to start listening for updates.
    this.fbClientsSubscription = this.fbClients.subscribe((clients)=>{ // subscribe to clients changes and then update contact form
      // console.log('Current clients: ', clients);
      this.detailOrderForm.value.client.name!=undefined ? this.filterClients(this.detailOrderForm.value.client.name) : this.filterClients(this.detailOrderForm.value.client);// pour lancer le chargement de la liste des contact en fonction du client choisi au chargement de la page.

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
    this.orderSubscription.unsubscribe();
    this.productsImmoSubscription.unsubscribe();
    this.fbEmployesSubscription.unsubscribe();
  }

  observeIndexNumeroInvoice() {
    console.log("observeIndexNumeroInvoice : ");
    this.db.doc<any>('parameters/numeroInvoice').valueChanges().subscribe(
      numeroInvoice => {
        this.indexNumeroInvoice = numeroInvoice.index;
        console.log("observeIndexNumeroInvoiceSubscribe : ", this.indexNumeroInvoice);
      });
  }

  testLackStock(productsImmo) { // teste si le total des stocks sont suffisants

    // var indices = productsImmo.reduce((r, v, i) => r.concat(v.product.id === '06vaN8oXVyhMxpOai6z0' ? i : []), []); // pour renvoyer juste les indices des occurences recherchées dans un tableau
    //console.log("testLackStock");
    var products = this.detailOrderForm.value.singleProduct.slice(); // make a copy of the array
    //console.log("testLackStock products ", products);
    for (var idxPdt = 0; idxPdt < this.detailOrderForm.value.compositeProducts.length; idxPdt++) {
      products = products.concat(this.detailOrderForm.value.compositeProducts[idxPdt].compositeProductElements);
    }
    //console.log("testLackStock products ", products);

    var productsAmount = this.detailOrderForm.value.singleProductAmount.slice();
    for (var idxPdt = 0; idxPdt < this.detailOrderForm.value.compositeProducts.length; idxPdt++) {
      for (var i= 0; i< this.detailOrderForm.value.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        productsAmount.push(this.detailOrderForm.value.compositeProductAmount[idxPdt])
      }
    }
    console.log("testLackStock products ", products, "testLackStock productsAmount ", productsAmount);

    products.forEach((product, idx)=>{
      if (product.type==="rental") {
        var productImmo = productsImmo.filter(immo => immo.product.id===product.id && immo.isImmo===true && immo.orderId!=this.orderId);
        var quantityProductImmo=productsAmount[idx];
        console.log("productsAmount[idx]", productsAmount[idx], " productImmo ", productImmo);
        for (var i=0; i<productImmo.length; i++) {
          quantityProductImmo+=productImmo[i].quantity;
          console.log("quantityProductImmo : ", quantityProductImmo);
        }
        if (quantityProductImmo>product.stock) {
          this.openDialogMessage("Attention les stocks du produit " + product.name + " sont insuffisants. Commandes en conflit : " + productImmo.map(e => ["commande "+ e.orderId + ' du '+ e.immoDateFrom.toDate().toLocaleDateString()+ ' au '+ e.immoDateTo.toDate().toLocaleDateString()+ ', quantité '+ e.quantity]).join("  /  "));
        }
      }
    });
  }

  isArchived(): boolean {
    var isArchived;
    this.route.snapshot.paramMap.get('archived')==="true" ? isArchived = true : isArchived = false;
    return isArchived;
  }

  setOrderTypeParams(isArchived:boolean) {
    console.log("isArchived :" + isArchived);
    if (isArchived) {
      this.orderTypeParams.path='archived-orders';
      this.orderTypeParams.isArchived='true';
      this.orderTypeParams.templateTitle= "Editer commande archivée n° ";
      this.orderTypeParams.templateButton="  désarchiver"
    }
    else {
      this.orderTypeParams.path='orders';
      this.orderTypeParams.isArchived='false';
      this.orderTypeParams.templateTitle = "Editer commande en cours n° ";
      this.orderTypeParams.templateButton="  archiver"
    }
  }

  getOrderId(): string {
    return this.route.snapshot.paramMap.get('orderId');
  }

  observeOrder(orderId: string) {
    console.log("observeOrder : "+orderId);
    //this.order = this.db.doc<Order>(this.orderTypeParams.path+'/'+orderId).valueChanges().pipe(
    this.order = this.db.doc<any>(this.orderTypeParams.path+'/'+orderId).valueChanges().pipe(
      tap(order => {
        if (order != undefined) {
          console.log("observe order :", order);
          // pour assurer la compatibilité avec les anciennes commandes fait avant les multiples  produits composés
          if (order.compositeProducts==undefined) {
            order.compositeProductAmount = [order.compositeProductAmount];
            order.compositeProducts=[{compositeProductElements: order.compositeProduct}];
          }
          this.setSingleProducts(order.singleProduct.length);
          this.setCompositeProducts(order.compositeProducts);
          this.setSpecialProducts(order.specialProduct.length);
          //if (order.optionalProduct!=undefined && order.optionalProduct.length>0) {this.setOptionalProducts(order.optionalProduct.length);}
          console.log("order.orderDate (TimeStamp) : ", order.orderDate);
          this.detailOrderForm.patchValue(order);
          // convert from TimeStamp (saved in firebase) to Date (used by angular DatePicker)
          if (order.rentDateFrom instanceof Timestamp) {this.detailOrderForm.controls['rentDateFrom'].patchValue(order.rentDateFrom.toDate())}
          if (order.rentDateTo instanceof Timestamp) {this.detailOrderForm.controls['rentDateTo'].patchValue(order.rentDateTo.toDate())}
          if (order.immoDateFrom instanceof Timestamp) {this.detailOrderForm.controls['immoDateFrom'].patchValue(order.immoDateFrom.toDate())}
          if (order.immoDateTo instanceof Timestamp) {this.detailOrderForm.controls['immoDateTo'].patchValue(order.immoDateTo.toDate())}
          if (order.orderDate instanceof Timestamp) {this.detailOrderForm.controls['orderDate'].patchValue(order.orderDate.toDate())}
          if (order.relaunchClientDate instanceof Timestamp) {this.detailOrderForm.controls['relaunchClientDate'].patchValue(order.relaunchClientDate.toDate())}
          if (order.installationDate instanceof Timestamp) {this.detailOrderForm.controls['installationDate'].patchValue(order.installationDate.toDate())}
          if (order.balanceInvoiceDate instanceof Timestamp) {this.detailOrderForm.controls['balanceInvoiceDate'].patchValue(order.balanceInvoiceDate.toDate())}
          // alternative solution
          //const timestamp = order.orderDate.seconds*1000;
          //order.orderDate = new Date(timestamp);
          if (order.scanOrder!='') {console.log("observeOrder : scanOrder exist"); this.downloadScanOrderURL = this.storage.ref(order.scanOrder).getDownloadURL();} else {this.downloadScanOrderURL = undefined}
          this.setPrice(this.computePriceService.computePrices(this.detailOrderForm.value));
          // vérification des stocks (devrait être fait automatiquement par le subscribe du form : bug ?
          this.stockService.verifyStock(this.detailOrderForm.value.singleProduct, this.detailOrderForm.value.compositeProducts, this.detailOrderForm.value.immoDateFrom, this.detailOrderForm.value.immoDateTo, this.orderId);
          console.log("observe order detailOrderForm after patchValue  ", this.detailOrderForm.value)
        }
      })
    );
    this.orderSubscription = this.order.subscribe(
      order => {
      }
      /*{
       next(order) { console.log('Current orders ', order); },
       error(msg) { console.log('Error Getting order ', msg);},
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
        var contacts:[Contact];
        if (client[0]!=undefined && client[0].contacts !=undefined && client.length==1) {// si longueur >1, c'est qu'il y a plusieurs résultats de clients possible, donc on ne charge pas de contacts
          console.log("client[0].contacts", client[0].contacts);
          contacts = client[0].contacts;
        }
        else {contacts=[{contactEmail: "", contactName: "", contactFunction: "", contactPhone: "", contactCellPhone: ""}]}
        this.contactOptions = fromArray([contacts]);
        this.contactOptions.subscribe((contacts) =>{console.log("contacts", contacts);});
        console.log("contactOption : " , this.contactOptions);
      }
    )
  }

  private _filterClient(name: string): ClientId[] {
    const filterValue = name.toLowerCase();
    return this.clientFormOptions.filter(clientOption => clientOption.name.toLowerCase().indexOf(filterValue) === 0);
  }

  compareContactOptionFn(x: any, y: any): boolean { // nécessaire pour mettre à jour dans le template au chargement de la page  le contact (car sinon angular ne siat pas sur quel champs comparer les objets)
    return x && y ? x.contactName === y.contactName : x === y;
  }

  compareEmployeOptionFn(x: any, y: any): boolean { // nécessaire pour mettre à jour dans le template au chargement de la page l'employe (car sinon angular ne sait pas sur quel champs comparer les objets)
    return x && y ? x.name === y.name : x === y;
  }

  /* for automplete product form */

  displayProductFn(product?: ProductId): string | undefined {
    return product ? product.name : undefined;
  }

  /* used for filter product*/
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

  /* used for add or remove single, composite and optionnal product*/
  setSingleProducts(l) {
    while (this.singleProduct.length !== 1) {
      this.singleProduct.removeAt(1);
    }
    this.detailOrderForm.value.singleProductAmount = [1];
    for (var i=0; i<l-1; i++) {
      this.addSingleProduct();
    }
  }

  get singleProduct() {
    return this.detailOrderForm.get('singleProduct') as FormArray;
  }

  addSingleProduct() {
    this.singleProduct.push(this.fb.control(''));
    this.detailOrderForm.value.singleProductAmount.push(1);
  }

  rmSingleProduct(i) {
    //console.log("rmSingleProduct : "+i);
    this.singleProduct.removeAt(Number(i));
    this.detailOrderForm.value.singleProductAmount.splice(Number(i),1);
  }

  private setSingleProductAmount(index: number, value: number) {
    //console.log("detailOrderForm.singleProductAmount :", this.detailOrderForm.value);
    this.detailOrderForm.value.singleProductAmount[index] = Number(value);
    this.setPrice(this.computePriceService.computePrices(this.detailOrderForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
    this.stockService.verifyStock(this.detailOrderForm.value.singleProduct, this.detailOrderForm.value.compositeProducts, this.detailOrderForm.value.immoDateFrom, this.detailOrderForm.value.immoDateTo, this.orderId);// vérification des stocks (devrait être fait automatiquement par le subscribe du form : bug ?
  }


  /* used for add or remove special product*/

  get specialProduct() {
    return this.detailOrderForm.get('specialProduct') as FormArray;
  }

  addSpecialProduct() {
    this.specialProduct.push(this.fb.control(''));
  }

  rmSpecialProduct(i) {
    this.specialProduct.removeAt(Number(i));
  }

  private setSpecialProductPrice(index: number, value: number) {
    //console.log("detailOrderForm.specialProductPrice:", this.detailOrderForm.value);
    this.detailOrderForm.value.specialProductPrice[index] = Number(value);
    this.setPrice(this.computePriceService.computePrices(this.detailOrderForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  setSpecialProducts(l) {
    while (this.specialProduct.length !== 1) {
      this.specialProduct.removeAt(1)
    }
    this.detailOrderForm.value.specialProductPrice = [0];
    for (var i=0; i<l-1; i++) {
      this.addSpecialProduct();
    }
  }

  // used for add or remove optionnal product
/*
  setOptionalProducts(l) {
    while (this.optionalProduct.length !== 1) {
      this.optionalProduct.removeAt(1);
    }
    this.detailOrderForm.value.optionalProductAmount = [1];
    for (var i=0; i<l-1; i++) {
      this.addOptionalProduct();
    }
  }

  get optionalProduct() {
    return this.detailOrderForm.get('optionalProduct') as FormArray;
  }

  addOptionalProduct() {
    this.optionalProduct.push(this.fb.control(''));
    this.detailOrderForm.value.optionalProductAmount.push(1);
  }

  rmOptionalProduct(i) {
    //console.log("rmOptionalProduct : "+i);
    this.optionalProduct.removeAt(Number(i));
    this.detailOrderForm.value.optionalProductAmount.splice(Number(i),1);
  }

  private setOptionalProductAmount(index: number, value: number) {
    //console.log("detailOrderForm.optionalProductAmount :", this.detailOrderForm.value);
    this.detailOrderForm.value.optionalProductAmount[index] = Number(value);
   }
   */

  /* used for add or remove composite product*/

  setCompositeProducts(cpdt) {
    //console.log("setCompositeProducts ", cpdt);
    while (this.compositeProducts.length !== 0) {
      this.compositeProducts.removeAt(0)
    }
    for (var idxPdt=0; idxPdt<cpdt.length; idxPdt++) {
      this.addCompositeProduct();
      for (var i=0; i<cpdt[idxPdt].compositeProductElements.length-1; i++) {
        this.addCompositeProductElement(idxPdt);
      }
    }
  }

  get compositeProducts() {
    return this.detailOrderForm.get('compositeProducts') as FormArray;
  }

  addCompositeProduct() {
    let element = this.fb.group({compositeProductElements: this.fb.array([this.fb.control('')])});
    this.compositeProducts.push(element);
    this.detailOrderForm.value.compositeProductAmount.push(1);
  }


  rmCompositeProduct(i) {
    console.log("rmCompositeProduct : "+i);
    this.compositeProducts.removeAt(Number(i));
    this.detailOrderForm.value.compositeProductAmount.splice(Number(i),1);
  }


  private setCompositeProductAmount(index: number, value: number) {
    //console.log("detailOrderForm.compositeProductAmount :", this.detailOrderForm.value);
    this.detailOrderForm.value.compositeProductAmount[index] = Number(value);
    this.setPrice(this.computePriceService.computePrices(this.detailOrderForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }


  addCompositeProductElement(idxPdt) {
    console.log('compositeProductElements before ', this.compositeProducts);
    var compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    this.compositeProducts.value[idxPdt] = compositePdts.push(this.fb.control(''));
    console.log('compositeProductElements after ', this.compositeProducts);
  }

  rmCompositeProductElement(idxPdt,i) {
    console.log("rmCompositeProductElement : "+i);
    var compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    this.compositeProducts.value[idxPdt] = compositePdts.removeAt(Number(i));
  }


  initForm() {
    this.detailOrderForm = this.fb.group({
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
      compositeProducts : this.fb.array([this.fb.group({compositeProductElements: this.fb.array([this.fb.control('')])})]),
      compositeProductAmount: [[1]],
      specialProduct: this.fb.array([
        this.fb.control('')
      ]),
      specialProductPrice: [[0]],
      //optionalProductAmount: [[1]],
      //optionalProduct: this.fb.array([this.fb.control('')]),
      rentDateFrom: [''],
      rentDateTo: [''],
      immoDateFrom: [''],
      immoDateTo: [''],
      quotationComment: [''],
      privateQuotationComment: [''],
      quotationDate: [''],
      quotationId: [''],
      clientOrderNumber : [''],
      relaunchClientDate:[''],
      installationAddress: [''],
      installationZipcode: [''],
      installationTown: [''],
      installationDate: [''],
      installationHours: [''],
      installationContactName: [''],
      installationContactPhone: [''],
      orderDate: ['', Validators.required],
      scanOrder: [''],
      balanceInvoiceDate: [''],
      orderComment: [''],
      deliveryComment: [''],
      advanceRate:[40],
      numerosInvoice: [{advance :null, balance : null}],
      credit: [0]
    });
    this.detailOrderForm.valueChanges.subscribe(data => {
      console.log('Form order changes', data);
      this.setPrice(this.computePriceService.computePrices(data));
      console.log('Form order changes', data);
      data.client.name!=undefined ? this.filterClients(data.client.name) : this.filterClients(data.client);

    });
    this.detailOrderPricesForm = this.fb.group({
      price: [0], // le prix de base
      rentalDiscount: [0],// le % de remise sur locations
      saleDiscount: [0],// le % de remise sur vente
      discountPrice: [0], // le prix une fois la remise appliquée
    });
  }

  wantUpdateOrder(isAskedByPdf, pdfType?:PdfType) {
    console.log("wantUpdateOrder", this.detailOrderForm.value);
    this.controlForm(isAskedByPdf, pdfType);
  }

  controlForm(isAskedByPdf, pdfType:PdfType) { // verify that client an products exists in database before save form
    var errorSource:string;
    if (this.detailOrderForm.value.client.id==undefined) {errorSource="client"}
    for (var i=0; i<this.detailOrderForm.value.singleProduct.length; i++) {if (this.detailOrderForm.value.singleProduct[i]!='' && this.detailOrderForm.value.singleProduct[i].id==undefined) {errorSource = "produit simple"}}
    for (var idxPdt=0; idxPdt<this.detailOrderForm.value.compositeProducts.length; idxPdt++) {
      for (var i=0; i<this.detailOrderForm.value.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (this.detailOrderForm.value.compositeProducts[idxPdt].compositeProductElements[i]!='' && this.detailOrderForm.value.compositeProducts[idxPdt].compositeProductElements[i].id==undefined) {errorSource="produit composé";}
      }
    }
    errorSource!=undefined? this.openFormErrorDialog(errorSource) : this.updateOrder(isAskedByPdf, pdfType);
  }

  openFormErrorDialog(errorSource): void {
    const dialogRef = this.dialog.open(DialogDetailOrderOverview, {
      width: '450px',
      data: {message: "Le "+errorSource+ " n'existe pas !"}
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }

  updateOrder(isAskedByPdf, pdfType:PdfType) { // save form in database as order
    console.warn(this.detailOrderForm.value);

    if (this.scanOrderPathToDeleteOnFirestorage!=undefined) {this.deletePhotoOnFirestorage();}
    if (this.scanOrderFile!=undefined) {
      this.uploadFile(isAskedByPdf, pdfType);
    }
    else {
      this.orderDoc = this.db.doc<Order>(this.orderTypeParams.path+'/' + this.orderId );
      this.orderDoc.update(this.detailOrderForm.value).then(data => {
        if (isAskedByPdf) {
          this.pdfService.wantGeneratePdf(this.detailOrderForm.value, this.orderId, pdfType);
        }
        else {
          this.openDialogMessage("La commande "+this.orderId+" a été mise à jour.")
        }
        });
        this.updateProductsStock();
    }
  }

  updateOrderAfterUploadFile(isAskedByPdf, pdfType:PdfType) {
    this.detailOrderForm.value.scanOrder=this.orderTypeParams.path+'/'+this.scanOrderFile.name;
    this.orderDoc = this.db.doc<Order>(this.orderTypeParams.path+'/' + this.orderId );
    this.orderDoc.update(this.detailOrderForm.value).then(data => {
      if (isAskedByPdf) {
        this.pdfService.wantGeneratePdf(this.detailOrderForm.value, this.orderId, pdfType);
      }
      else {
        this.openDialogMessage("La commande "+this.orderId+" a été mise à jour.")
      }
      this.scanOrderFile=undefined;});
      this.updateProductsStock();
  }

  updateProductsStock() {
    if (this.detailOrderForm.value.immoDateFrom!='' && this.detailOrderForm.value.immoDateTo!='') {
      this.stockService.updateProductsStock(this.detailOrderForm.value.singleProduct, this.detailOrderForm.value.singleProductAmount, this.detailOrderForm.value.compositeProducts, this.detailOrderForm.value.compositeProductAmount, this.detailOrderForm.value.immoDateFrom, this.detailOrderForm.value.immoDateTo, this.orderId);
    }
  }

  wantDeleteOrder() {
    console.warn("wantDeleteOrder"+this.orderId);
    this.openDialogWantDelete("Voulez-vous vraiment supprimer la commande "+this.orderId+" ?");
  }

  deleteOrder() { // delete order in database
    console.warn("deleteOrder"+this.orderId);
    this.orderDoc = this.db.doc<Order>(this.orderTypeParams.path+'/' + this.orderId );
    this.orderDoc.delete().then(data => {
      this.openDialogDelete("La commande "+this.orderId+" a été supprimée.")});
  }

  openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogDetailOrderOverview, {
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
    const dialogRef = this.dialog.open(DialogDetailOrderOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      if (result=='yes') {
        this.deleteOrder();
      }
    });
  }

  openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogDetailOrderOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.router.navigate(['list-orders/', {archived: this.orderTypeParams.isArchived}]);
    });
  }

  setPrice(prices) {
    this.detailOrderPricesForm.value.price = prices.price;
    this.detailOrderPricesForm.value.rentalDiscount= prices.rentalDiscount;
    this.detailOrderPricesForm.value.saleDiscount= prices.saleDiscount;
    //this.detailOrderPricesForm.value.discountPrice = prices.price - prices.price*prices.discount/100;
    this.detailOrderPricesForm.value.discountPrice = prices.discountPrice;
  }


  // appel aux services pour générer les pdf
  wantGenerateAdvanceInvoicePdf() {
    this.controlAndSetNumeroAdvanceInvoice();
    this.wantUpdateOrder(true, PdfType.advanceInvoice);
  }
  wantGenerateBalanceInvoicePdf() {
    if (this.detailOrderForm.value.balanceInvoiceDate===undefined || this.detailOrderForm.value.balanceInvoiceDate==='' || this.detailOrderForm.value.balanceInvoiceDate===null) {
      this.openDialogMessage("Vous devez spécifier une date pour la facture de solde !");
    }
    else {
      this.controlAndSetNumeroBalanceInvoice();
      this.wantUpdateOrder(true, PdfType.balanceInvoice);
    }
  }
  wantGeneratePreparationReceiptPdf() {
    this.wantUpdateOrder(true, PdfType.preparationReceipt);
  }
  wantGenerateDeliveryReceiptPdf() {
    this.wantUpdateOrder(true, PdfType.deliveryReceipt);
  }

  controlAndSetNumeroAdvanceInvoice() {
    if (this.detailOrderForm.value.numerosInvoice.advance === null) {
      this.detailOrderForm.value.numerosInvoice.advance = this.indexNumeroInvoice+1;
      this.db.collection('parameters').doc("numeroInvoice").update({index: this.indexNumeroInvoice+1});
    }
  }
  controlAndSetNumeroBalanceInvoice() {
    if (this.detailOrderForm.value.numerosInvoice.balance === null) {
      this.detailOrderForm.value.numerosInvoice.balance = this.indexNumeroInvoice+1;
      this.db.collection('parameters').doc("numeroInvoice").update({index: this.indexNumeroInvoice+1});
    }
  }


  wantArchiveOrder() {
    console.log("wantArchiveOrder");
    var message;
    this.orderTypeParams.isArchived==="true" ? message ="Voulez-vous vraiment désarchiver la commande " : message = "Voulez-vous vraiment archiver la commande ";
    this.openDialogWantArchive(message +this.orderId+" ?");
  }

  openDialogWantArchive(message): void {
    const dialogRef = this.dialog.open(DialogDetailOrderOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      if (result=='yes') {
        this.archiveOrder();
      }
    });
  }

  archiveOrder() { // save or sort order in database as archived order
    console.log("archiveOrder");
    var newPath, oldPath, message;
    if (this.orderTypeParams.isArchived==="true" ) {
      newPath = "orders";
      oldPath = "archived-orders";
      message = "La commande a été replacée dans les commandes courantes sous le numéro "
    }
    else {
      newPath = "archived-orders";
      oldPath = "orders";
      message = "La commande a été archivée sous le numéro "
    }
    this.db.collection(newPath).doc(this.orderId).set(this.detailOrderForm.value).then(()=> {
      console.log("new order written with ID: ", this.orderId);
      this.orderDoc = this.db.doc<Order>(oldPath+'/' + this.orderId );
      this.orderDoc.delete().then(()=> {
        this.openDialogArchive(message + this.orderId)});
    });
  }

  openDialogArchive(message): void {
    const dialogRef = this.dialog.open(DialogDetailOrderOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.router.navigate(['list-orders/', {archived: this.orderTypeParams.isArchived}]);
    });
  }


  /**
   * scanOrder FILE GESTION
   */
  updateScanOrder(event) {
    //todo deleteFileBefore
    this.scanOrderFile = event.target.files[0];
    console.log("updateScanOrder :"+this.scanOrderFile.name);
    this.bug=false;
  }

  uploadFile(isAskedByPdf, pdfType:PdfType) {
    console.log("uploadFile :"+this.scanOrderFile.name);
    const fileRef = this.storage.ref(this.orderTypeParams.path+'/'+this.scanOrderFile.name);
    // test si le fichier existe déjà
    fileRef.getDownloadURL().toPromise().then(
      onResolve=> { // le fichier existe
        this.openDialogMessage("Le fichier existe déjà, veuillez en utiliser un autre");
      },
      onReject => {// le fichier n'existe pas, on peut l'uploader
        console.log("file doesn't exists");
        const fileRef = this.storage.ref(this.orderTypeParams.path+'/'+this.scanOrderFile.name);
        const task = this.storage.upload(this.orderTypeParams.path+'/'+this.scanOrderFile.name, this.scanOrderFile);

        // get notified when the download URL is available
        task.snapshotChanges().pipe(
          finalize(() => {
            this.downloadScanOrderURL = fileRef.getDownloadURL();
            this.updateOrderAfterUploadFile(isAskedByPdf, pdfType);
          } )
          )
          .subscribe()
      }
    );
  }

  deleteScanOrder(inputFile) {
    console.log("deleteScanOrder");
    inputFile.value='';
    this.scanOrderFile=undefined;
  }

  wantDeleteScanOrderOnFirestorage() {
    console.log("wantDeleteScanOrderOnFirestorage");
    // prepare delete scanOrder on storage when user save form
    this.downloadScanOrderURL=undefined;
    this.scanOrderPathToDeleteOnFirestorage=this.detailOrderForm.value.scanOrder;
    console.log("wantDeleteScanOrderOnFirestorage : "+ this.scanOrderPathToDeleteOnFirestorage);
    this.detailOrderForm.value.scanOrder='';
    this.bug=true;
    console.log(this.detailOrderForm.value);
  }

  deletePhotoOnFirestorage() {
    console.log("deletePhotoOnFirestorage"+this.scanOrderPathToDeleteOnFirestorage);
    this.storage.ref(this.scanOrderPathToDeleteOnFirestorage).delete();
    this.scanOrderPathToDeleteOnFirestorage=undefined;
  }

  /**
   * END scanOrder FILE GESTION
   */
}


@Component({
  selector: 'dialog-detail-order-overview',
  templateUrl: 'dialog-detail-order-overview.html',
})
export class DialogDetailOrderOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogDetailOrderOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogDetailOrderData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
