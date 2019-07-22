import {Component, OnInit, OnDestroy, Inject} from '@angular/core';
import { Validators, FormGroup, FormControl, FormBuilder, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import {Observable, of, from} from 'rxjs';
import {tap, map, startWith} from 'rxjs/operators';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Client } from '../../client/client';
import { Contact } from '../../client/contact';
import { Product } from '../../product/product';
import { Employe } from '../../employe/employe';
import {Subscription} from "rxjs/index";
import {fromArray} from "rxjs/internal/observable/fromArray";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Quotation} from "../quotation";
import {ComputePriceService} from "../../price/compute-price.service";

export interface ClientId extends Client { id: string; }
export interface ProductId extends Product { id: string; }
export interface EmployeId extends Employe { id: string; }
export interface DialogCreateQuotationData { message: string; }


@Component({
  selector: 'app-create-quotation',
  templateUrl: './create-quotation.component.html',
  styleUrls: ['./create-quotation.component.less']
})
export class CreateQuotationComponent implements OnInit {

  // for client
  private fbClients: Observable<ClientId[]>; // clients on Firebase
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

  // the global form that will be store on firestore as quotation
  createQuotationForm;
  createQuotationPricesForm;
  private quotationsCollection: AngularFirestoreCollection<Quotation>;
  private numerosQuotation:any;

  constructor(private router: Router, private db: AngularFirestore, private fb: FormBuilder, private dialog: MatDialog, private computePriceService: ComputePriceService) {

    this.quotationsCollection = db.collection('quotations');

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
        const internal_number = data.internal_number
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
       // this.productFormOptions.push({id, name, description, serial_number, internal_number, barcode, stock, type, sell_price, rent_price, apply_degressivity, photo, comment, date});
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
    this.initForm();

    this.observeNumeroQuotation();

    // Call subscribe() to start listening for updates.
    this.fbClientsSubscription = this.fbClients.subscribe((clients)=>{ // subscribe to clients changes and then update contact form
      console.log('Current clients: ', clients);
      this.filterClients(''); // permet de charger la liste de tous les clients dans le select (puisque le contenu du filtre est vide) au chargement de la page
    });

    this.fbProductsSubscription = this.fbProducts.subscribe({ // subscribe to product change
      next(products) { console.log('Current products: ', products);},
      error(msg) { console.log('Error Getting products ', msg);},
      complete() {console.log('complete');
      }
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
    this.fbEmployesSubscription.unsubscribe();
  }

  observeNumeroQuotation() {
    console.log("observeNumeroQuotation : ");
     this.db.doc<any>('parameters/numerosQuotation').valueChanges().subscribe(
      numerosQuotation => {
        this.numerosQuotation = numerosQuotation;
        console.log("observeNumeroQuotationSubscribe : ", this.numerosQuotation);
      });
  }

  /* for autocomplete client form */
  // fonction qui permet d'afficher dans le formulaire que le nom alors que c'est l'objet complet qui est sauvagardé
  displayClientFn(client?: ClientId): string | undefined {
    return client ? client.name : undefined;
  }

  // for autocmplete, filtre le client

  filterClients(clientP) {
    console.log("filterClient", " / ", clientP);
    console.log(this._filterClient(clientP));
    this.clientFilteredOptions = fromArray([this._filterClient(clientP)]);
    this.clientFilteredOptions.subscribe((client)=> {
        var contacts:[Contact];
        if (client[0]!=undefined && client[0].contacts !=undefined && client.length==1) { // si longueur >1, c'est qu'il y a plusieurs résultats de clients possible, donc on ne charge pas de contacts
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
/*
  filterClientsClick(event: KeyboardEvent) {
    console.log("filterClientClick", " / ", (<HTMLInputElement>event.target).value);
    console.log(this._filterClient((<HTMLInputElement>event.target).value));
    this.clientFilteredOptions = fromArray([this._filterClient((<HTMLInputElement>event.target).value)]);
    this.clientFilteredOptions.subscribe((client)=> {
        var contacts:[Contact];
        if (client[0]!=undefined && client[0].contacts !=undefined && client.length==1) { // si longueur >1, c'est qu'il y a plusieirs résultats de clients possible, donc on ne charge pas de contacts
          console.log("client[0].contacts", client[0].contacts);
          contacts = client[0].contacts;
        }
        else {contacts=[{contactEmail: "", contactName: "", contactPhone: ""}]}
        this.contactOptions = fromArray([contacts]);
        this.contactOptions.subscribe((contacts) =>{console.log("contacts", contacts);});
        console.log("contactOption : " , this.contactOptions);
      }
    )
  }
  */

  private _filterClient(name: string): ClientId[] {
    const filterValue = name.toLowerCase();
    return this.clientFormOptions.filter(clientOption => clientOption.name.toLowerCase().indexOf(filterValue) === 0);
  }


  /* for automplete product form */

  displayProductFn(product?: ProductId): string | undefined {
    return product ? product.name : undefined;
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


  /* used for add or remove single product*/

  get singleProduct() {
    return this.createQuotationForm.get('singleProduct') as FormArray;
  }

  addSingleProduct() {
    this.singleProduct.push(this.fb.control(''));
    this.createQuotationForm.value.singleProductAmount.push(1);
  }

  rmSingleProduct(i) {
    //console.log("rmSingleProduct : "+i);
    this.singleProduct.removeAt(Number(i));
    this.createQuotationForm.value.singleProductAmount.splice(Number(i),1);
  }

  private setSingleProductAmount(index: number, value: number) {
    //console.log("createQuotationForm.singleProductAmount :", this.createQuotationForm.value);
    this.createQuotationForm.value.singleProductAmount[index] = Number(value);
    this.setPrice(this.computePriceService.computePrices(this.createQuotationForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }


  /* used for add or remove special product*/

  get specialProduct() {
    return this.createQuotationForm.get('specialProduct') as FormArray;
  }

  addSpecialProduct() {
    this.specialProduct.push(this.fb.control(''));
  }

  rmSpecialProduct(i) {
    this.specialProduct.removeAt(Number(i));
  }
  private setSpecialProductPrice(index: number, value: number) {
    //console.log("createQuotationForm.specialProductPrice:", this.createQuotationForm.value);
    this.createQuotationForm.value.specialProductPrice[index] = Number(value);
    this.setPrice(this.computePriceService.computePrices(this.createQuotationForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  /* used for add or remove optionnal product*/

  setOptionalProducts(l) {
    while (this.optionalProduct.length !== 1) {
      this.optionalProduct.removeAt(1);
    }
    this.createQuotationForm.value.optionalProductAmount = [1];
    for (var i=0; i<l-1; i++) {
      this.addOptionalProduct();
    }
  }

  get optionalProduct() {
    return this.createQuotationForm.get('optionalProduct') as FormArray;
  }

  addOptionalProduct() {
    this.optionalProduct.push(this.fb.control(''));
    this.createQuotationForm.value.optionalProductAmount.push(1);
  }

  rmOptionalProduct(i) {
    //console.log("rmOptionalProduct : "+i);
    this.optionalProduct.removeAt(Number(i));
    this.createQuotationForm.value.optionalProductAmount.splice(Number(i),1);
  }

  private setOptionalProductAmount(index: number, value: number) {
    //console.log("createQuotationForm.optionalProductAmount :", this.createQuotationForm.value);
    this.createQuotationForm.value.optionalProductAmount[index] = Number(value);
  }

  /* used for add or remove composite product*/


  get compositeProducts() {
    return this.createQuotationForm.get('compositeProducts') as FormArray;
  }

  addCompositeProduct() {
    let element = this.fb.group({compositeProductElements: this.fb.array([this.fb.control('')])});
    this.compositeProducts.push(element);
    this.createQuotationForm.value.compositeProductAmount.push(1);
  }


  rmCompositeProduct(i) {
    console.log("rmCompositeProduct : "+i);
    this.compositeProducts.removeAt(Number(i));
    this.createQuotationForm.value.compositeProductAmount.splice(Number(i),1);
  }


  private setCompositeProductAmount(index: number, value: number) {
    //console.log("createQuotationForm.compositeProductAmount :", this.createQuotationForm.value);
    this.createQuotationForm.value.compositeProductAmount[index] = Number(value);
    this.setPrice(this.computePriceService.computePrices(this.createQuotationForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
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
     this.createQuotationForm = this.fb.group({
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
       optionalProductAmount: [[1]],
       optionalProduct: this.fb.array([
         this.fb.control('')
       ]),
       rentDateFrom: [''],
       rentDateTo: [''],
       immoDateFrom: [''],
       immoDateTo: [''],
       quotationComment: [''],
       privateQuotationComment: [''],
       quotationDate: [new Date(), Validators.required],
       relaunchClientDate:[''],
       installationAddress: [''],
       installationZipcode: [''],
       installationTown: [''],
       installationDate: [''],
       installationHours: [''],
       installationContactName: [''],
       installationContactPhone: [''],
    });
    this.createQuotationForm.valueChanges.subscribe(data => {
      console.log('Form quotation changes', data);
      this.setPrice(this.computePriceService.computePrices(data));
      console.log('Form quotation changes', data);
      data.client.name!=undefined ? this.filterClients(data.client.name) : this.filterClients(data.client);
    });

    this.createQuotationPricesForm = this.fb.group({
      price: [0],
      rentalDiscount: [0],
      saleDiscount: [0],
      discountPrice: [0],
    });
  }

  wantAddQuotation() {
    console.log("wantToAdddQuotation", this.createQuotationForm.value);
    this.controlForm();
  }

  controlForm() {
    var errorSource:string;
    if (this.createQuotationForm.value.client.id==undefined) {errorSource="client"}
    for (var i=0; i<this.createQuotationForm.value.singleProduct.length; i++) {if (this.createQuotationForm.value.singleProduct[i]!='' && this.createQuotationForm.value.singleProduct[i].id==undefined) {errorSource = "produit simple"}}
    for (var idxPdt=0; idxPdt<this.createQuotationForm.value.compositeProducts.length; idxPdt++) {
      for (var i=0; i<this.createQuotationForm.value.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (this.createQuotationForm.value.compositeProducts[idxPdt].compositeProductElements[i]!='' && this.createQuotationForm.value.compositeProducts[idxPdt].compositeProductElements[i].id==undefined) {errorSource="produit composé";}
      }
    }
    for (var i=0; i<this.createQuotationForm.value.optionalProduct.length; i++) {if (this.createQuotationForm.value.optionalProduct[i]!='' && this.createQuotationForm.value.optionalProduct[i].id==undefined) {errorSource="produit optionnel";}}
    errorSource!=undefined? this.openFormErrorDialog(errorSource) : this.addQuotation();
  }

  openFormErrorDialog(errorSource): void {
    const dialogRef = this.dialog.open(DialogCreateQuotationOverview, {
      width: '450px',
      data: {message: "Le "+errorSource+ " n'existe pas !"}
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }

  addQuotation() {
    console.log("addQuotation", this.createQuotationForm.value);
    const id = this.updateNumeroQuotation();
    this.quotationsCollection.doc(id.toString()).set(this.createQuotationForm.value).then(()=> {
      console.log("Quotation written with ID: ", id);
      this.db.collection('parameters').doc("numerosQuotation").update(this.numerosQuotation);
          this.openAddQuotationDialog(id)}).
        catch(function(error) {
          console.error("Error adding document: ", error);
        });
  }

  openAddQuotationDialog(id): void {
    const dialogRef = this.dialog.open(DialogCreateQuotationOverview, {
      width: '450px',
      data: {message: "Le devis a bien été enregistré sous le numéro " + id}
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
     // this.initForm();
      this.router.navigate(['detail-quotation/'+id]);
    });
  }

  setPrice(prices) {
    this.createQuotationPricesForm.value.price = prices.price;
    this.createQuotationPricesForm.value.rentalDiscount= prices.rentalDiscount;
    this.createQuotationPricesForm.value.saleDiscount= prices.saleDiscount;
    this.createQuotationPricesForm.value.discountPrice = prices.discountPrice;
  }

  updateNumeroQuotation():string { // pour incrémenter le numéro du devis en fonction de l'année et du mois de création du devis
    const yearAndMonth:string = this.getQuotationYearAndMonth(this.createQuotationForm.value.quotationDate);
    var numeroQuotation:number;
    var id:string;
    var yearAndMonthIndex = this.numerosQuotation.numerosQuotation.findIndex(function(element) {
      return element.yearAndMonth === yearAndMonth;
    });
    if (yearAndMonthIndex!=-1) {
      numeroQuotation = this.numerosQuotation.numerosQuotation[yearAndMonthIndex].numero ;
      this.numerosQuotation.numerosQuotation[yearAndMonthIndex]= {yearAndMonth : yearAndMonth, numero: numeroQuotation+1};
      id = yearAndMonth+'-'+(numeroQuotation+1);
    }
    else { this.numerosQuotation.numerosQuotation.push({yearAndMonth : yearAndMonth, numero: 1});
      id = yearAndMonth+'-1';
    }
    return id;
  }

  getQuotationYearAndMonth(quotationDate):string {
    if (quotationDate instanceof Date) {
      return quotationDate.getFullYear()+'-'+(quotationDate.getMonth()+1); // !!! attention la propriété getMonth() retourne un entier entre 0 (janvier) et 11 (décembre)
    }
    else return "";
  }

}


@Component({
  selector: 'dialog-create-quotation-overview',
  templateUrl: 'dialog-create-quotation-overview.html',
})
export class DialogCreateQuotationOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogCreateQuotationOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogCreateQuotationData) {}
}


