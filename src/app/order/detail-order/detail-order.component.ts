import { Component, OnInit, Inject } from '@angular/core';
import { Client } from '../../client/client';
import {Contact} from '../../client/contact';
import { Product } from '../../product/product';
import { Order } from '../order';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs'
import {tap, finalize, startWith, map} from 'rxjs/operators';
import {fromArray} from "rxjs/internal/observable/fromArray";
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import {FormBuilder, FormArray, FormControl} from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs";
import { AngularFireStorage } from '@angular/fire/storage';
import {PdfService} from "../../pdf/pdf.service";
import {PdfType} from '../../pdf/pdf-type';
import {ComputePriceService} from "../../price/compute-price.service";
import { StockService } from '../../product/stock/stock.service';
import {Employe} from "../../employe/employe";
import {ProductType} from "../../product/ProductType";
import {FirebaseServices} from "../../common-services/firebaseServices";
import {OrderFormManager} from "../../forms/orderFormManager";
import {PricesFormManager} from "../../forms/pricesFormManager";

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
  private fbClientsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private clientFormOptions =[]; // used by autoocmplete client form
  // formulaire utilisé pour la recherche de client, pas pour le stockage des valeurs
  public searchClientFormControl = new FormControl();
  // tableau qui contient l'ensemble des noms des clients non filtrés, utilisé par le formulaire de recherche client
  private _searchClientFormControlData: string[] = [];
  // tableaux qui contiennent le nom des clients filtrés en fonction de la recherche
  public searchClientFormControlDataFiltered: Observable<string[]>;

  // for contact
  public contactOptions:Observable<Contact[]>;// used by select contact form
  private contactOptionsSubscribtion: Subscription;

  // for product
  private fbProductsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private productFormOptions =[]; // used by autocomplete product form

  // formulaires de recherche des produits (simple, composés, optionnels), utilisés pour la recherche de produit, pas pour le stockage des valeurs
  public searchCompositeProductFormControls = this.fb.array( [this.fb.group({compositeProductSearchElements: this.fb.array([this.fb.control('')])})]);
  public searchSingleProductFormControls = this.fb.array([this.fb.control('')]);
  public searchOptionalProductFormControls = this.fb.array([this.fb.control('')]);
  // tableau qui contient le nom de l'ensemble des produits non filtrés
  private _searchProductFormControlData: string[] = [];
  // tableaux qui contiennent le nom des produits filtrés en fonction de la recherche
  public searchSingleProductFormControlDataFiltered: Observable<string[]>[] = [];
  public searchCompositeProductFormControlDataFiltered: Observable<string[]>[][] = [[]];
  public searchOptionalProductFormControlDataFiltered: Observable<string[]>[] = [];

  // for employe
  public fbEmployes: Observable<EmployeId[]>; // employes on firebase
  private fbEmployesSubscription : Subscription; // // then we can unsubscribe after having subscribe

  // for order and global form
  public orderForm;
  public pricesForm;
  public orderId: string;
  private orderDoc: AngularFirestoreDocument<Order>;
  private order: Observable<Order>;
  private orderSubscription : Subscription;
  public orderTypeParams={path : "orders", isArchived:'false', templateTitle:"Editer commande en cours n° ", templateButton:"  archiver"}; // les paramètres liés au type de commande (archivées ou courantes)
  private indexNumeroInvoice:number;

  // scanOrder File gestion
  downloadScanOrderURL: Observable<string>; // l'url de la photo sur firestorage (! ce n'est pas la référence)
  private scanOrderFile:File; //le fichier de la photo du produit à uploader
  private scanOrderPathToDeleteOnFirestorage:string; // le nom du fichier photo à supprimer sur Firestorage
  private bug:boolean = false;

  // stock gestion
  private productsImmoSubscription : Subscription; // subscription au tableau des stocks des produits de la commande
  private orderFormManager : OrderFormManager;
  private pricesFormManager : PricesFormManager;

  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore,
              private fb: FormBuilder, private dialog: MatDialog, private storage: AngularFireStorage,
              private pdfService: PdfService, private computePriceService: ComputePriceService,
              private stockService: StockService, private firebaseServices : FirebaseServices) {
    this.orderFormManager = new OrderFormManager();
    this.pricesFormManager = new PricesFormManager();
    this.setOrderTypeParams();
  }

  ngOnInit() {
    this.orderId = this.route.snapshot.paramMap.get('orderId');
    this._setSearchClientFormControlDataFiltered();
    this._setSearchSingleProductFormControlDataFiltered(0);
    this._setSearchCompositeProductFormControlDataFiltered(0, 0);
    this._setSearchOptionalProductFormControlDataFiltered(0);
    this.initForm();
    this.observeOrder(this.orderId);
    this.observeIndexNumeroInvoice();

    this.fbClientsSubscription = this.firebaseServices.getClients()
      .subscribe((clients) => {
        this.clientFormOptions = Array.from(clients);
        //this.orderForm.value.client.name !== undefined ? this.filterClients(this.orderForm.value.client.name) : this.filterClients(this.orderForm.value.client);
        this._subscribeContactFromClient(this.orderForm.value.client);
        // on stocke le nom de l'ensemble des clients (utilisé dans le formulaire de recherche de client)
        this._searchClientFormControlData = [];
        for (let client of clients) {
          this._searchClientFormControlData.push(client.name);
        }
      });

    this.fbProductsSubscription = this.firebaseServices.getProducts()
      .subscribe( (products) => {
        this.productFormOptions = Array.from(products);
        // on stocke le nom de l'ensemble de nos produits (utilé dans les formulaires de recherche)
        this._searchProductFormControlData = [];
        for (let product of products) {
          this._searchProductFormControlData.push(product.name);
        }
      });

    this.fbEmployes = this.firebaseServices.getEmployes();
    this.fbEmployesSubscription = this.fbEmployes.subscribe();

    this.productsImmoSubscription = this.stockService.getProductsImmo().subscribe(productsImmo => {
      if (productsImmo != undefined) {
        this.testLackStock(productsImmo);
      }
    });
  }

  ngOnDestroy() {
    // unsubscribe to avoid memory leaks
    this.fbClientsSubscription.unsubscribe();
    this.fbProductsSubscription.unsubscribe();
    this.orderSubscription.unsubscribe();
    this.productsImmoSubscription.unsubscribe();
    this.fbEmployesSubscription.unsubscribe();
    if (this.contactOptionsSubscribtion) {
      this.contactOptionsSubscribtion.unsubscribe();
    }
  }

  private observeIndexNumeroInvoice() {
    //console.log("observeIndexNumeroInvoice : ");
    this.db.doc<any>('parameters/numeroInvoice').valueChanges().subscribe(
      numeroInvoice => {
        this.indexNumeroInvoice = numeroInvoice.index;
        //console.log("observeIndexNumeroInvoiceSubscribe : ", this.indexNumeroInvoice);
      });
  }

  /**
   * teste si le total des stocks sont suffisants
   * @param productsImmo
   */
  testLackStock(productsImmo) {
    /* pour renvoyer juste les indices des occurences recherchées dans un tableau
     let indices = productsImmo.reduce((r, v, i) => r.concat(v.product.id === '06vaN8oXVyhMxpOai6z0' ? i : []), []);
     */
    let products = this.orderForm.value.singleProduct.slice(); // make a copy of the array
    //console.log("testLackStock products ", products);
    for (let idxPdt = 0; idxPdt < this.orderForm.value.compositeProducts.length; idxPdt++) {
      products = products.concat(this.orderForm.value.compositeProducts[idxPdt].compositeProductElements);
    }
    //console.log("testLackStock products ", products);

    let productsAmount = this.orderForm.value.singleProductAmount.slice();
    for (let idxPdt = 0; idxPdt < this.orderForm.value.compositeProducts.length; idxPdt++) {
      for (let i= 0; i< this.orderForm.value.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        productsAmount.push(this.orderForm.value.compositeProductAmount[idxPdt])
      }
    }
    //console.log("testLackStock products ", products, "testLackStock productsAmount ", productsAmount);

    products.forEach((product, idx)=>{
      if (product.type === ProductType.rental || product.type === ProductType.longRental) {
        let productImmo = productsImmo.filter(immo => immo.product.id === product.id && immo.isImmo === true && immo.orderId != this.orderId);
        let quantityProductImmo=productsAmount[idx];
        //console.log("productsAmount[idx]", productsAmount[idx], " productImmo ", productImmo);
        for (let i=0; i<productImmo.length; i++) {
          quantityProductImmo+=productImmo[i].quantity;
          //console.log("quantityProductImmo : ", quantityProductImmo);
        }
        if (quantityProductImmo > product.stock) {
          this.openDialogMessage("Attention les stocks du produit " + product.name + " sont insuffisants. Commandes en conflit : " + productImmo.map(e => ["commande "+ e.orderId + ' du '+ e.immoDateFrom.toDate().toLocaleDateString()+ ' au '+ e.immoDateTo.toDate().toLocaleDateString()+ ', quantité '+ e.quantity]).join("  /  "));
        }
      }
    });
  }

  private setOrderTypeParams() {
    //console.log("setOrderTypeParams");
    if (this.route.snapshot.paramMap.get('archived')==="true") {
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

  private observeOrder(orderId: string) {
    //console.log("observeOrder : "+orderId);
    //this.order = this.db.doc<Order>(this.orderTypeParams.path+'/'+orderId).valueChanges().pipe(
    this.order = this.db.doc<any>(this.orderTypeParams.path+'/'+orderId).valueChanges().pipe(
      tap(order => {
        if (order != undefined) {
          //console.log("observe order :", order);
          // pour assurer la compatibilité avec les anciennes commandes fait avant les multiples  produits composés
          if (order.compositeProducts == undefined) {
            order.compositeProductAmount = [order.compositeProductAmount];
            order.compositeProducts=[{compositeProductElements: order.compositeProduct}];
          }
          this.setSingleProducts(order.singleProduct.length);
          this.setCompositeProducts(order.compositeProducts);
          this.setSpecialProducts(order.specialProduct.length);
          if (order.externalCosts !== undefined) { // pour assurer compatibilité commandes faites avant implémentation coûts externes
            this.setExternalCosts(order.externalCosts);
          }
          //console.log("order.orderDate (TimeStamp) : ", order.orderDate);
          this.orderForm.patchValue(order);
          this.orderFormManager.patchDates(order);
          this.setSearchClientFromOrder(order.client);
          this.setSearchSingleProductFromOrder(order.singleProduct);
          this.setSearchCompositeProductFromOrder(order.compositeProducts);
          this.setSearchOptionalProductFromOrder(order.optionalProduct);
          if (order.scanOrder!='') {
            //console.log("observeOrder : scanOrder exist");
            this.downloadScanOrderURL = this.storage.ref(order.scanOrder).getDownloadURL();
          } else {
            this.downloadScanOrderURL = undefined
          }
          this.setPrices();
          // vérification des stocks (devrait être fait automatiquement par le subscribe du form : bug ?
          this.stockService.verifyStock(this.orderForm.value.singleProduct, this.orderForm.value.compositeProducts, this.orderForm.value.immoDateFrom, this.orderForm.value.immoDateTo, this.orderId);
          //console.log("observe order orderForm after patchValue  ", this.orderForm.value)
        } else {
          //console.log("no order at this index");
        }
      })
    );
    this.orderSubscription = this.order.subscribe( () => {});
  }

  private _subscribeContactFromClient(client: Client) {
    let contacts: Contact[] = client.contacts as Contact[];
    if (client.contacts === undefined || client.contacts.length === 0) {
      contacts = [{
        contactEmail: "",
        contactName: "",
        contactFunction: "",
        contactPhone: "",
        contactCellPhone: ""
      }];
    }
    if (this.contactOptionsSubscribtion) {
      this.contactOptionsSubscribtion.unsubscribe();
    }
    this.contactOptions = fromArray([contacts]);
    this.contactOptionsSubscribtion = this.contactOptions.subscribe(()=> {
      // si le nom d'un contact est renseigné en base et qu'aucun nom est renseigné dans le formulaire, on affecte par défaut le premier contact
      if (client.contacts !== undefined && client.contacts.length > 0 && client.contacts[0].contactName !== "" && this.orderForm.controls.contact.value.contactName === "") {
        this.orderForm.controls.contact.patchValue(client.contacts[0]);
      }
      // si aucun contact n'existe en base ou qu'il existe mais que son nom n'est pas défini, on charge par défaut un objet contact vide
      else if ((client.contacts === undefined || client.contacts.length === 0 || (client.contacts.length > 0 && client.contacts[0].contactName === "")) && (this.orderForm.controls.contact.value.contactName === undefined || this.orderForm.controls.contact.value.contactName === null)) {
        this.orderForm.controls.contact.patchValue(contacts[0]);
      }
    });
  }



  // fonctions qui active le filtre des clients dans les formulaires de recherche de client
  private _setSearchClientFormControlDataFiltered() {
    this.searchClientFormControlDataFiltered = this.searchClientFormControl
      .valueChanges.pipe( startWith(''), map(value => this._filterSearchClientFormControlData(value)));
  }

  private _filterSearchClientFormControlData(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this._searchClientFormControlData.filter(option => option.toLowerCase().includes(filterValue));
  }

  // affecte le client dans le formulaire de devis en fonction du nom du client sélectionné dans les formulaires de recherche
  setClientFromSearchClientFormControl() {
    fromArray([this._filterClient(this.searchClientFormControl.value)]).subscribe((data: Client[])=>{
      this.orderForm.controls.client.patchValue(data[0]);
      this.orderForm.controls.contact.patchValue({
        contactEmail: "",
        contactName: "",
        contactFunction: "",
        contactPhone: "",
        contactCellPhone: ""
      });
      this._subscribeContactFromClient(data[0]);
    });
  }

  // affecte le client dans le formulaire de recherche de client en fonction du nom du client enregistré dans la commande
  setSearchClientFromOrder(i_client: Client) {
    this.searchClientFormControl.patchValue(i_client.name);
  }

  private _filterClient(name: string): ClientId[] {
    const filterValue = name.toLowerCase();
    return this.clientFormOptions.filter(clientOption => clientOption.name.toLowerCase().indexOf(filterValue) === 0);
  }
  /*
  //for autocomplete, filtre le client
  private filterClients(clientP) {
    //console.log("filterClient", " / ", clientP);
    this.clientFilteredOptions = fromArray([this._filterClient(clientP)]);
    this.clientFilteredOptions.subscribe((client)=> {
        let contacts:Contact[];
      if (client[0]!=undefined && client[0].contacts !=undefined && client.length==1) {
        contacts = client[0].contacts;
      } else if (client[0]!=undefined && client[0].contacts !=undefined && client.length>1 && clientP.length>2) {
          for (let i=0; i<client.length; i++) {
            console.log("client[i].name", client[i].name);
            if (client[i].name === clientP) {
              contacts = client[0].contacts;
              break;
            } else {contacts=[{contactEmail: "", contactName: "", contactFunction: "", contactPhone: "", contactCellPhone: ""}]}
          }
        } else {
        contacts=[{contactEmail: "", contactName: "", contactFunction: "", contactPhone: "", contactCellPhone: ""}]
      }
        this.contactOptions = fromArray([contacts]);
        this.contactOptions.subscribe();
        //console.log("contactOption : " , this.contactOptions);
      }
    )
  }
   */



  /* nécessaire pour mettre à jour dans le template au chargement de la page  le contact (car sinon angular ne siat pas sur quel champs comparer les objets) */
  public compareContactOptionFn(x: any, y: any): boolean {
    return x && y ? x.contactName === y.contactName : x === y;
  }

  /* nécessaire pour mettre à jour dans le template au chargement de la page l'employe (car sinon angular ne sait pas sur quel champs comparer les objets) */
  public compareEmployeOptionFn(x: any, y: any): boolean {
    return x && y ? x.name === y.name : x === y;
  }

  /*
  //for automplete product form
  public displayProductFn(product?: ProductId): string | undefined {
    return product ? product.name : undefined;
  }


  //used for filter product
  public filterProducts(i, event: Event) {
    //console.log("filterProduct", i, " / ", (<HTMLInputElement>event.target).value);
    //console.log(this._filterProducts((<HTMLInputElement>event.target).value));
    this.productFormOptionsFiltered = fromArray([this._filterProducts((<HTMLInputElement>event.target).value)]);
  }
   */


  /**
   * fonctions qui activent le filtre des produits dans les formulaires de recherche de produits simples, composés et optionnels
   * doivent être appelées à l'initialisation de la page et à chaque fois que l'on veut rajouter ou supprimer un produit
   */

  private _setSearchSingleProductFormControlDataFiltered(i_index: number) {
    this.searchSingleProductFormControlDataFiltered[i_index] = this.searchSingleProductFormControls.controls[i_index]
      .valueChanges.pipe( startWith(''), map(value => this._filterSearchProductFormControlData(value)));
    /*
    this.searchSingleProductFormControlDataFiltered = merge(...this.searchSingleProductFormControls.controls.map((control: AbstractControl, index: number) =>
      control.valueChanges.pipe( startWith(''), map(value => this._filterSearchProductFormControlData(value, index)))));
     */
  }

  private _setSearchCompositeProductFormControlDataFiltered(i_indexPdt: number, i_indexElement: number) {
    if (this.searchCompositeProductFormControlDataFiltered[i_indexPdt] === undefined) { this.searchCompositeProductFormControlDataFiltered[i_indexPdt] = [];}
    let compositeProductSearchElements = this.searchCompositeProductFormControls.controls[i_indexPdt].get('compositeProductSearchElements') as FormArray;
    //console.log(this.searchCompositeProductFormControls.controls);
    if (compositeProductSearchElements.controls[i_indexElement]) {
      this.searchCompositeProductFormControlDataFiltered[i_indexPdt].push(compositeProductSearchElements.controls[i_indexElement]
        .valueChanges.pipe( startWith(''), map(value => this._filterSearchProductFormControlData(value))));
    } else {
      console.error("compositeProductSearchElements.controls[i_indexElement] undefined")
    }
  }

  private _setSearchOptionalProductFormControlDataFiltered(i_index: number) {
    this.searchOptionalProductFormControlDataFiltered[i_index] = this.searchOptionalProductFormControls.controls[i_index]
      .valueChanges.pipe( startWith(''), map(value => this._filterSearchProductFormControlData(value)));
  }

  private _filterSearchProductFormControlData(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this._searchProductFormControlData.filter(option => option.toLowerCase().includes(filterValue));
  }

  // affecte le produit simple dans le formulaire de devis en fonction du nom de produit simple sélectionné dans les formulaires de recherche
  setSingleProductFromSearchProductFormControl(i: number) {
    fromArray([this._filterProducts(this.searchSingleProductFormControls.controls[i].value)]).subscribe((data)=>{
      this.orderForm.controls.singleProduct.controls[i].patchValue(data[0]);
    });
  }
  // affecte le produit composé dans le formulaire de devis en fonction du nom de produit composé sélectionné dans les formulaires de recherche
  setCompositeProductFromSearchProductFormControl(i: number, idxPdt: number) {
    let compositeProductSearchElements = this.searchCompositeProductFormControls.controls[idxPdt].get('compositeProductSearchElements') as FormArray;
    fromArray([this._filterProducts(compositeProductSearchElements.controls[i].value)]).subscribe((data)=>{
      this.orderForm.controls.compositeProducts.controls[idxPdt].controls.compositeProductElements.controls[i].patchValue(data[0]);
    });
  }
  // affecte le produit optionnel dans le formulaire de devis en fonction du nom de produit optionnel sélectionné dans les formulaires de recherche
  setOptionalProductFromSearchProductFormControl(i: number) {
    fromArray([this._filterProducts(this.searchOptionalProductFormControls.controls[i].value)]).subscribe((data)=>{
      this.orderForm.controls.optionalProduct.controls[i].patchValue(data[0]);
    });
  }

  private _filterProducts(value: string): ProductId[] {
    //console.log("value", value);
    const filterValue = value.toLowerCase();
    return this.productFormOptions.filter(productOption => productOption.name.toLowerCase().indexOf(filterValue) === 0);
  }

  // affecte le nom du produit dans les formulaires de recherche de produit simple en fonction du nom du produit enregistré dans le devis
  setSearchSingleProductFromOrder(i_product: Product[]) {
    for (let i: number = 0; i< this.searchSingleProductFormControls.controls.length; i++) {
      if (i_product[i] && i_product[i].name) {
        this.searchSingleProductFormControls.controls[i].patchValue(i_product[i].name);
      }
    }
  }
  // affecte le nom du produit dans les formulaires de recherche de produit composite en fonction du nom du produit enregistré dans le devis
  setSearchCompositeProductFromOrder(i_product: {compositeProductElements:Product[]}[]) {
    //console.log("i_product", i_product);
    for (let i: number = 0; i < i_product.length; i++) {
      let compositeProductSearchElements = this.searchCompositeProductFormControls.controls[i].get('compositeProductSearchElements') as FormArray;
      if (i_product[i] !== undefined) {
        for (let ii: number = 0; ii< i_product[i].compositeProductElements.length; ii++) {
          if (i_product[i] && i_product[i].compositeProductElements[ii] && i_product[i].compositeProductElements[ii].name) {
            compositeProductSearchElements.controls[ii].patchValue(i_product[i].compositeProductElements[ii].name);
          }
        }
      }
    }
  }
  // affecte le nom du produit dans les formulaires de recherche de produit optionnel en fonction du nom du produit enregistré dans le devis
  setSearchOptionalProductFromOrder(i_product: Product) {
    for (let i: number = 0; i< this.searchOptionalProductFormControls.controls.length; i++) {
      if (i_product[i] && i_product[i].name) {
        this.searchOptionalProductFormControls.controls[i].patchValue(i_product[i].name);
      }
    }
  }

  /* used for add or remove single, composite and optionnal product*/
  private setSingleProducts(l) {
    while (this.singleProduct.length !== 1) {
      this.singleProduct.removeAt(1);
    }
    this.orderForm.value.singleProductAmount = [1];
    for (let i=0; i<l-1; i++) {
      this.addSingleProduct();
    }
  }

  get singleProduct() {
    return this.orderForm.get('singleProduct') as FormArray;
  }

  public addSingleProduct() {
    this.singleProduct.push(this.fb.control(''));
    this.orderForm.value.singleProductAmount.push(1);
    this.searchSingleProductFormControls.push(this.fb.control(''));
    this._setSearchSingleProductFormControlDataFiltered(this.searchSingleProductFormControls.controls.length-1);
  }

  public rmSingleProduct(i) {
    //console.log("rmSingleProduct : "+i);
    this.singleProduct.removeAt(Number(i));
    this.orderForm.value.singleProductAmount.splice(Number(i),1);
    this.searchSingleProductFormControls.removeAt(Number(i));
    this.searchSingleProductFormControlDataFiltered.splice(i, 1);
  }

  private setSingleProductAmount(index: number, value: string) {
    //console.log("detailOrderForm.singleProductAmount :", this.detailOrderForm.value);
    this.orderForm.value.singleProductAmount[index] = Number(value);
    /* maj du prix (devrait être fait automatiquement par le subscribe du form : bug ? */
    this.setPrices();
    this.stockService.verifyStock(this.orderForm.value.singleProduct, this.orderForm.value.compositeProducts, this.orderForm.value.immoDateFrom, this.orderForm.value.immoDateTo, this.orderId);// vérification des stocks (devrait être fait automatiquement par le subscribe du form : bug ?
  }


  /* used for add or remove special product*/

  get specialProduct() {
    return this.orderForm.get('specialProduct') as FormArray;
  }

  public addSpecialProduct() {
    this.specialProduct.push(this.fb.control(''));
    this.orderForm.value.specialProductPrice.push(0);
  }

  public rmSpecialProduct(i) {
    this.specialProduct.removeAt(Number(i));
    this.orderForm.value.specialProductPrice.splice(i,1);
  }

  private setSpecialProductPrice(index: number, value: string) {
    //console.log("detailOrderForm.specialProductPrice:", this.detailOrderForm.value);
    this.orderForm.value.specialProductPrice[index] = Number(value);
    /* maj du prix (devrait être fait automatiquement par le subscribe du form : bug ? */
    this.setPrices();
  }

  private setSpecialProducts(l) {
    while (this.specialProduct.length !== 1) {
      this.specialProduct.removeAt(1)
    }
    this.orderForm.value.specialProductPrice = [0];
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
    return this.orderForm.get('compositeProducts') as FormArray;
  }

  public addCompositeProduct() {
    let element = this.fb.group({compositeProductElements: this.fb.array([this.fb.control('')])});
    this.compositeProducts.push(element);
    this.orderForm.value.compositeProductAmount.push(1);
    let searchElement = this.fb.group({compositeProductSearchElements: this.fb.array([this.fb.control('')])});
    this.searchCompositeProductFormControls.push(searchElement);
    this._setSearchCompositeProductFormControlDataFiltered(this.searchCompositeProductFormControls.controls.length - 1, 0);
  }

  public rmCompositeProduct(i) {
    //console.log("rmCompositeProduct : "+i);
    this.compositeProducts.removeAt(Number(i));
    this.orderForm.value.compositeProductAmount.splice(Number(i),1);
    this.searchCompositeProductFormControls.removeAt(Number(i));
    this.searchCompositeProductFormControlDataFiltered.splice(i, 1);
  }

  private setCompositeProductAmount(index: number, value: string) {
    //console.log("detailOrderForm.compositeProductAmount :", this.detailOrderForm.value);
    this.orderForm.value.compositeProductAmount[index] = Number(value);
    /* maj du prix (devrait être fait automatiquement par le subscribe du form : bug ? */
    this.setPrices();
  }

  public addCompositeProductElement(idxPdt) {
    //console.log('compositeProductElements before ', this.compositeProducts);
    let compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    this.compositeProducts.value[idxPdt] = compositePdts.push(this.fb.control(''));
    let searchCompositePdts = this.searchCompositeProductFormControls.controls[idxPdt].get('compositeProductSearchElements') as FormArray;
    this.searchCompositeProductFormControls.value[idxPdt] = searchCompositePdts.push(this.fb.control(''));
    this._setSearchCompositeProductFormControlDataFiltered(idxPdt, searchCompositePdts.controls.length -1 );
  }

  public rmCompositeProductElement(idxPdt,i) {
    //console.log("rmCompositeProductElement : "+i);
    let compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    this.compositeProducts.value[idxPdt] = compositePdts.removeAt(Number(i));
    let searchCompositePdts = this.searchCompositeProductFormControls.controls[idxPdt].get('compositeProductSearchElements') as FormArray;
    this.searchCompositeProductFormControls.value[idxPdt] = searchCompositePdts.removeAt(Number(i));
    this.searchCompositeProductFormControlDataFiltered[idxPdt].splice(i, 1);
  }

  /* used for add or remove external costs*/
  get externalCosts() {
    return this.orderForm.get('externalCosts') as FormArray;
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
    this.orderForm = this.orderFormManager.getForm();
    this.orderForm.valueChanges.subscribe(data => {
      //console.log('Form order changes', data);
      const prices = this.computePriceService.computePrices(data);
      this.pricesFormManager.setPrices(prices);
      this.orderFormManager.setPaymentInvoice(prices);
      //console.log('Form order changes', data);
      //data.client.name!=undefined ? this.filterClients(data.client.name) : this.filterClients(data.client);
      this._subscribeContactFromClient(data.client);

    });
    this.pricesForm = this.pricesFormManager.getForm();
  }

  public wantUpdateOrder(isAskedByPdf, pdfType?:PdfType) {
    //console.log("wantUpdateOrder", this.orderForm.value);
    this.controlForm(isAskedByPdf, pdfType);
  }

  private controlForm(isAskedByPdf, pdfType:PdfType) { // verify that client an products exists in database before save form
    let errorSource:string;
    if (this.orderForm.value.client.id==undefined) {errorSource="client"}
    for (let i=0; i<this.orderForm.value.singleProduct.length; i++) {if (this.orderForm.value.singleProduct[i]!='' && this.orderForm.value.singleProduct[i].id==undefined) {errorSource = "produit simple"}}
    for (let idxPdt=0; idxPdt<this.orderForm.value.compositeProducts.length; idxPdt++) {
      for (let i=0; i<this.orderForm.value.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (this.orderForm.value.compositeProducts[idxPdt].compositeProductElements[i]!='' && this.orderForm.value.compositeProducts[idxPdt].compositeProductElements[i].id==undefined) {errorSource="produit composé";}
      }
    }
    errorSource!=undefined? this.openFormErrorDialog(errorSource) : this.updateOrder(isAskedByPdf, pdfType);
  }

  private openFormErrorDialog(errorSource): void {
    const dialogRef = this.dialog.open(DialogDetailOrderOverview, {
      width: '450px',
      data: {message: "Le " + errorSource + " n'existe pas !"}
    });
    dialogRef.afterClosed().subscribe(() => {
      //console.log('The dialog was closed');
    });
  }

  /**
   * save form in database as order
   * @param isAskedByPdf
   * @param pdfType
   */
  private updateOrder(isAskedByPdf, pdfType:PdfType) {
    //console.warn(this.orderForm.value);

    if (this.scanOrderPathToDeleteOnFirestorage!=undefined) {this.deletePhotoOnFirestorage();}
    if (this.scanOrderFile!=undefined) {
      this.uploadFile(isAskedByPdf, pdfType);
    }
    else {
      this.orderDoc = this.db.doc<Order>(this.orderTypeParams.path+'/' + this.orderId );
      this.orderDoc.update(this.orderForm.value).then( () => {
        if (isAskedByPdf) {
          this.pdfService.wantGeneratePdf(this.orderForm.value, this.orderId, pdfType);
        }
        else {
          this.openDialogMessage("La commande "+this.orderId+" a été mise à jour.")
        }
      });
        this.updateProductsStock();
    }
  }

  private updateOrderAfterUploadFile(isAskedByPdf, pdfType:PdfType) {
    this.orderForm.value.scanOrder=this.orderTypeParams.path+'/'+this.scanOrderFile.name;
    this.orderDoc = this.db.doc<Order>(this.orderTypeParams.path+'/' + this.orderId );
    this.orderDoc.update(this.orderForm.value).then(() => {
      if (isAskedByPdf) {
        this.pdfService.wantGeneratePdf(this.orderForm.value, this.orderId, pdfType);
      }
      else {
        this.openDialogMessage("La commande "+this.orderId+" a été mise à jour.")
      }
      this.scanOrderFile=undefined;});
      this.updateProductsStock();
  }

  private updateProductsStock() {
    if (this.orderForm.value.immoDateFrom!='' && this.orderForm.value.immoDateTo!='') {
      this.stockService.updateProductsStock(this.orderForm.value.singleProduct, this.orderForm.value.singleProductAmount, this.orderForm.value.compositeProducts, this.orderForm.value.compositeProductAmount, this.orderForm.value.immoDateFrom, this.orderForm.value.immoDateTo, this.orderId);
    }
  }

  private openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogDetailOrderOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      //console.log('The dialog was closed');
    });
  }

  private setPrices() {
    const prices = this.computePriceService.computePrices(this.orderForm.value);
    this.pricesFormManager.setPrices(prices);
    this.orderFormManager.setPaymentInvoice(prices);
    }

  /**
   * appel aux services pour générer les pdf
   */

  public wantGenerateAdvanceInvoicePdf() {
    if (typeof this.orderForm.value.advanceRate !== "number" || this.orderForm.value.advanceRate<=0 || this.orderForm.value.advanceRate>100) {
      this.openDialogMessage("Vous devez spécifier un taux de facture acompte supérieur à zéro pour générer une facture d'acompte !");
    } else {
      this.controlAndSetAdvanceInvoiceDate();
      this.controlAndSetNumeroAdvanceInvoice();
      this.wantUpdateOrder(true, PdfType.advanceInvoice);
    }
  }

  public wantGenerateBalanceInvoicePdf() {
    if (this.orderForm.value.balanceInvoiceDate===undefined || this.orderForm.value.balanceInvoiceDate==='' || this.orderForm.value.balanceInvoiceDate===null) {
      this.openDialogMessage("Vous devez spécifier une date pour la facture de solde !");
    } else if (this.orderForm.value.advanceRate >= 100) {
      this.openDialogMessage("Le taux de facture d'acompte doit être inférieur à 100");
    } else {
      this.controlAndSetNumeroBalanceInvoice();
      this.wantUpdateOrder(true, PdfType.balanceInvoice);
    }
  }

  public wantGeneratePreparationReceiptPdf() {
    this.wantUpdateOrder(true, PdfType.preparationReceipt);
  }

  public wantGenerateDeliveryReceiptPdf() {
    this.wantUpdateOrder(true, PdfType.deliveryReceipt);
  }

  private controlAndSetAdvanceInvoiceDate() {
    if (this.orderForm.value.advanceInvoiceDate===undefined || this.orderForm.value.advanceInvoiceDate==='' || this.orderForm.value.advanceInvoiceDate===null) {
      this.orderForm.value.advanceInvoiceDate = new Date();
    }
  }

  private controlAndSetNumeroAdvanceInvoice() {
    if (this.orderForm.value.numerosInvoice.advance === null) {
      this.orderForm.value.numerosInvoice.advance = this.indexNumeroInvoice+1;
      this.db.collection('parameters').doc("numeroInvoice").update({index: this.indexNumeroInvoice + 1}).then(() => {});
    }
  }

  private controlAndSetNumeroBalanceInvoice() {
    if (this.orderForm.value.numerosInvoice.balance === null) {
      this.orderForm.value.numerosInvoice.balance = this.indexNumeroInvoice+1;
      this.db.collection('parameters').doc("numeroInvoice").update({index: this.indexNumeroInvoice + 1}).then(()=>{});
    }
  }

  public wantArchiveOrder() {
    //console.log("wantArchiveOrder");
    let message;
    this.orderTypeParams.isArchived==="true" ? message ="Voulez-vous vraiment désarchiver la commande " : message = "Voulez-vous vraiment archiver la commande ";
    this.openDialogWantArchive(message +this.orderId+" ?");
  }

  private openDialogWantArchive(message): void {
    const dialogRef = this.dialog.open(DialogDetailOrderOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      //console.log('The dialog was closed');
      if (result=='yes') {
        this.archiveOrder();
      }
    });
  }

  /**
   * save or sort order in database as archived order
   */
  private archiveOrder() {
    //console.log("archiveOrder");
    let newPath, oldPath, message;
    if (this.orderTypeParams.isArchived==="true" ) {
      newPath = "orders";
      oldPath = "archived-orders";
      message = "La commande a été replacée dans les commandes courantes sous le numéro "
    } else {
      newPath = "archived-orders";
      oldPath = "orders";
      message = "La commande a été archivée sous le numéro "
    }
    this.db.collection(newPath).doc(this.orderId).set(this.orderForm.value).then(()=> {
      //console.log("new order written with ID: ", this.orderId);
      this.orderDoc = this.db.doc<Order>(oldPath+'/' + this.orderId );
      this.orderDoc.delete().then(()=> {
        this.openDialogArchive(message + this.orderId)});
    });
  }

  private openDialogArchive(message): void {
    const dialogRef = this.dialog.open(DialogDetailOrderOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      //console.log('The dialog was closed');
      this.router.navigate(['list-orders/', {archived: this.orderTypeParams.isArchived}]).then(()=>{});
    });
  }

  /**
   * scanOrder FILE GESTION
   */
  public updateScanOrder(event) {
    //todo deleteFileBefore
    this.scanOrderFile = event.target.files[0];
    //console.log("updateScanOrder :"+this.scanOrderFile.name);
    this.bug=false;
  }

  private uploadFile(isAskedByPdf, pdfType:PdfType) {
    //console.log("uploadFile :"+this.scanOrderFile.name);
    const fileRef = this.storage.ref(this.orderTypeParams.path+'/'+this.scanOrderFile.name);
    // test si le fichier existe déjà
    fileRef.getDownloadURL().toPromise().then(
      () => { // le fichier existe
        this.openDialogMessage("Le fichier existe déjà, veuillez en utiliser un autre");
      },
      () => {// le fichier n'existe pas, on peut l'uploader
        //console.log("file doesn't exists");
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

  public deleteScanOrder(inputFile) {
    //console.log("deleteScanOrder");
    inputFile.value='';
    this.scanOrderFile=undefined;
  }

  public wantDeleteScanOrderOnFirestorage() {
    //console.log("wantDeleteScanOrderOnFirestorage");
    // prepare delete scanOrder on storage when user save form
    this.downloadScanOrderURL=undefined;
    this.scanOrderPathToDeleteOnFirestorage=this.orderForm.value.scanOrder;
    //console.log("wantDeleteScanOrderOnFirestorage : "+ this.scanOrderPathToDeleteOnFirestorage);
    this.orderForm.value.scanOrder='';
    this.bug=true;
    //console.log(this.orderForm.value);
  }

  private deletePhotoOnFirestorage() {
    //console.log("deletePhotoOnFirestorage"+this.scanOrderPathToDeleteOnFirestorage);
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
