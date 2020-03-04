import {Component, OnInit, Inject} from '@angular/core';
import { FormBuilder, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import {Observable} from 'rxjs';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Client } from '../../client/client';
import { Contact } from '../../client/contact';
import { Product } from '../../product/product';
import { Employe } from '../../employe/employe';
import {Subscription} from "rxjs";
import {fromArray} from "rxjs/internal/observable/fromArray";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Quotation} from "../quotation";
import {ComputePriceService} from "../../price/compute-price.service";
import {FirebaseServices} from "../../common-services/firebaseServices";
import {QuotationFormManager} from "../../forms/quotation-form-manager.service";
import {PricesFormManager} from "../../forms/pricesFormManager";
import {UtilServices} from "../../common-services/utilServices";

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
  private fbClientsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private clientFormOptions =[]; // used by autoocmplete client form
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
  private quotationsCollection: AngularFirestoreCollection<Quotation>;
  private numerosQuotation:any;

  private quotationFormManager : QuotationFormManager;
  private pricesFormManager : PricesFormManager;

  constructor(private router: Router, private db: AngularFirestore, private fb: FormBuilder,
              private dialog: MatDialog, private computePriceService: ComputePriceService,
              private firebaseServices : FirebaseServices
              ) {
    this.quotationFormManager = new QuotationFormManager();
    this.pricesFormManager = new PricesFormManager();
    this.quotationsCollection = db.collection('quotations');
  }

  ngOnInit() {

    this.initForm();
    this.observeNumeroQuotation();
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


    // Call subscribe() to start listening for updates.
    /*
    this.fbClientsSubscription = this.fbClients.subscribe((clients)=>{ // subscribe to clients changes and then update contact form
      //console.log('Current clients: ', clients);
      this.filterClients(''); // permet de charger la liste de tous les clients dans le select (puisque le contenu du filtre est vide) au chargement de la page
    });

     */

  }

  ngOnDestroy() {
    // unsubscribe to avoid memory leaks
    this.fbClientsSubscription.unsubscribe();
    this.fbProductsSubscription.unsubscribe();
    this.fbEmployesSubscription.unsubscribe();
  }

  observeNumeroQuotation() {
    //console.log("observeNumeroQuotation : ");
     this.db.doc<any>('parameters/numerosQuotation').valueChanges().subscribe(
      numerosQuotation => {
        this.numerosQuotation = numerosQuotation;
        //console.log("observeNumeroQuotationSubscribe : ", this.numerosQuotation);
      });
  }

  /* for autocomplete client form */
  // fonction qui permet d'afficher dans le formulaire que le nom alors que c'est l'objet complet qui est sauvagardé
  displayClientFn(client?: ClientId): string | undefined {
    return client ? client.name : undefined;
  }

  // for autocmplete, filtre le client

  filterClients(clientP) {
    //console.log("filterClient", " / ", clientP);
    //console.log(this._filterClient(clientP));
    this.clientFilteredOptions = fromArray([this._filterClient(clientP)]);
    this.clientFilteredOptions.subscribe((client)=> {
        let contacts:[Contact];
        if (client[0]!=undefined && client[0].contacts !=undefined && client.length==1) { // si longueur >1, c'est qu'il y a plusieurs résultats de clients possible, donc on ne charge pas de contacts
          //console.log("client[0].contacts", client[0].contacts);
            contacts = client[0].contacts;
        }
      else {contacts=[{contactEmail: "", contactName: "", contactFunction: "", contactPhone: "", contactCellPhone: ""}]}
        this.contactOptions = fromArray([contacts]);
        this.contactOptions.subscribe();
        //console.log("contactOption : " , this.contactOptions);
      }
    )
  }
/*
  filterClientsClick(event: KeyboardEvent) {
    //console.log("filterClientClick", " / ", (<HTMLInputElement>event.target).value);
    //console.log(this._filterClient((<HTMLInputElement>event.target).value));
    this.clientFilteredOptions = fromArray([this._filterClient((<HTMLInputElement>event.target).value)]);
    this.clientFilteredOptions.subscribe((client)=> {
        let contacts:[Contact];
        if (client[0]!=undefined && client[0].contacts !=undefined && client.length==1) { // si longueur >1, c'est qu'il y a plusieirs résultats de clients possible, donc on ne charge pas de contacts
          //console.log("client[0].contacts", client[0].contacts);
          contacts = client[0].contacts;
        }
        else {contacts=[{contactEmail: "", contactName: "", contactPhone: ""}]}
        this.contactOptions = fromArray([contacts]);
        this.contactOptions.subscribe();
        //console.log("contactOption : " , this.contactOptions);
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

  get singleProduct() {
    return this.quotationForm.get('singleProduct') as FormArray;
  }

  addSingleProduct() {
    this.singleProduct.push(this.fb.control(''));
    this.quotationForm.value.singleProductAmount.push(1);
  }

  rmSingleProduct(i) {
    //console.log("rmSingleProduct : "+i);
    this.singleProduct.removeAt(Number(i));
    this.quotationForm.value.singleProductAmount.splice(Number(i),1);
  }

  private setSingleProductAmount(index: number, value: number) {
    //console.log("createQuotationForm.singleProductAmount :", this.createQuotationForm.value);
    this.quotationForm.value.singleProductAmount[index] = Number(value);
    this.pricesFormManager.setPrices(this.computePriceService.computePrices(this.quotationForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
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
    //console.log("createQuotationForm.specialProductPrice:", this.createQuotationForm.value);
    this.quotationForm.value.specialProductPrice[index] = Number(value);
    this.pricesFormManager.setPrices(this.computePriceService.computePrices(this.quotationForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  /* used for add or remove optionnal product*/

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
    //console.log("createQuotationForm.optionalProductAmount :", this.createQuotationForm.value);
    this.quotationForm.value.optionalProductAmount[index] = Number(value);
  }

  /* used for add or remove composite product*/


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
    //console.log("createQuotationForm.compositeProductAmount :", this.createQuotationForm.value);
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

  wantAddQuotation() {
    //console.log("wantToAdddQuotation", this.quotationForm.value);
    this.controlForm();
  }

  controlForm() {
    let errorSource:string;
    if (this.quotationForm.value.client.id==undefined) {errorSource="client"}
    for (let i=0; i<this.quotationForm.value.singleProduct.length; i++) {if (this.quotationForm.value.singleProduct[i]!='' && this.quotationForm.value.singleProduct[i].id==undefined) {errorSource = "produit simple"}}
    for (let idxPdt=0; idxPdt<this.quotationForm.value.compositeProducts.length; idxPdt++) {
      for (let i=0; i<this.quotationForm.value.compositeProducts[idxPdt].compositeProductElements.length; i++) {
        if (this.quotationForm.value.compositeProducts[idxPdt].compositeProductElements[i]!='' && this.quotationForm.value.compositeProducts[idxPdt].compositeProductElements[i].id==undefined) {errorSource="produit composé";}
      }
    }
    for (let i=0; i<this.quotationForm.value.optionalProduct.length; i++) {if (this.quotationForm.value.optionalProduct[i]!='' && this.quotationForm.value.optionalProduct[i].id==undefined) {errorSource="produit optionnel";}}
    errorSource!=undefined? this.openFormErrorDialog(errorSource) : this.addQuotation();
  }

  openFormErrorDialog(errorSource): void {
    const dialogRef = this.dialog.open(DialogCreateQuotationOverview, {
      width: '450px',
      data: {message: "Le "+errorSource+ " n'existe pas !"}
    });
    dialogRef.afterClosed().subscribe();
  }

  addQuotation() {
    //console.log("addQuotation", this.quotationForm.value);
    const id = this.updateNumeroQuotation();
    this.quotationsCollection.doc(id.toString()).set(this.quotationForm.value).then(()=> {
      //console.log("Quotation written with ID: ", id);
      this.db.collection('parameters').doc("numerosQuotation").update(this.numerosQuotation).then();
          this.openAddQuotationDialog(id)}).
        catch(function(error) {
          //console.error("Error adding document: ", error);
        });
  }

  openAddQuotationDialog(id): void {
    const dialogRef = this.dialog.open(DialogCreateQuotationOverview, {
      width: '450px',
      data: {message: "Le devis a bien été enregistré sous le numéro " + id}
    });
    dialogRef.afterClosed().subscribe(() => {
      //console.log('The dialog was closed');
      this.router.navigate(['detail-quotation/'+id]).then();
    });
  }

  updateNumeroQuotation():string { // pour incrémenter le numéro du devis en fonction de l'année et du mois de création du devis
    const yearAndMonth:string = UtilServices.getDateYearAndMonth(this.quotationForm.value.quotationDate);
    let numeroQuotation:number;
    let id:string;
    let yearAndMonthIndex = this.numerosQuotation.numerosQuotation.findIndex(function(element) {
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


