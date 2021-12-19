import {Component, OnInit, Inject} from '@angular/core';
import {FormBuilder, FormArray, FormControl} from '@angular/forms';
import { Router } from '@angular/router';
import { Observable} from 'rxjs';
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
import {map, startWith} from "rxjs/operators";

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
  private clientFormOptions =[]; //contient l'ensemble des clients non filtrés
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

  // for product search
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
    this._setSearchClientFormControlDataFiltered();
    this._setSearchSingleProductFormControlDataFiltered(0);
    this._setSearchCompositeProductFormControlDataFiltered(0, 0);
    this._setSearchOptionalProductFormControlDataFiltered(0);
    this.initForm();
    this.observeNumeroQuotation();
    this.fbClientsSubscription = this.firebaseServices.getClients()
      .subscribe((clients) => {
        this.clientFormOptions = Array.from(clients);
        this._subscribeContactFromClient(this.quotationForm.value.client);
        // on stocke le nom de l'ensemble des clients (utilisé dans le formulaire de recherche de client)
        this._searchClientFormControlData = [];
        for (let client of clients) {
          this._searchClientFormControlData.push(client.name);
        }
      });

    this.fbProductsSubscription = this.firebaseServices.getProducts()
      .subscribe( (products) => {
        // on stocke l'ensemble de nos produits dans un tableau
        this.productFormOptions = Array.from(products);
        // on stocke le nom de l'ensemble de nos produits (utilé dans les formulaires de recherche)
        this._searchProductFormControlData = [];
        for (let product of products) {
          this._searchProductFormControlData.push(product.name);
        }
      });

    this.fbEmployes = this.firebaseServices.getEmployes();
    this.fbEmployesSubscription = this.fbEmployes.subscribe();

  }


  ngOnDestroy() {
    // unsubscribe to avoid memory leaks
    this.fbClientsSubscription.unsubscribe();
    this.fbProductsSubscription.unsubscribe();
    this.fbEmployesSubscription.unsubscribe();
    if (this.contactOptionsSubscribtion) {
      this.contactOptionsSubscribtion.unsubscribe();
   }
  }

  observeNumeroQuotation() {
    //console.log("observeNumeroQuotation : ");
     this.db.doc<any>('parameters/numerosQuotation').valueChanges().subscribe(
      numerosQuotation => {
        this.numerosQuotation = numerosQuotation;
        //console.log("observeNumeroQuotationSubscribe : ", this.numerosQuotation);
      });
  }

  /**
   *  for autocomplete client form
   */

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
        if (client.contacts !== undefined && client.contacts.length > 0 && client.contacts[0].contactName !== "" && this.quotationForm.controls.contact.value.contactName === "") {
        this.quotationForm.controls.contact.patchValue(client.contacts[0]);
        }
        // si aucun contact n'existe en base ou qu'il existe mais que son nom n'est pas défini, on charge par défaut un objet contact vide
        else if ((client.contacts === undefined || client.contacts.length === 0 || (client.contacts.length > 0 && client.contacts[0].contactName === "")) && (this.quotationForm.controls.contact.value.contactName === undefined || this.quotationForm.controls.contact.value.contactName === null)) {
        this.quotationForm.controls.contact.patchValue(contacts[0]);
      }
    });
  }

  // recherche de clients
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
      this.quotationForm.controls.client.patchValue(data[0]);
      this.quotationForm.controls.contact.patchValue({
        contactEmail: "",
        contactName: "",
        contactFunction: "",
        contactPhone: "",
        contactCellPhone: ""
      });
      this._subscribeContactFromClient(data[0]);
    });
  }

  private _filterClient(name: string): ClientId[] {
    const filterValue = name.toLowerCase();
    return this.clientFormOptions.filter(clientOption => clientOption.name.toLowerCase().indexOf(filterValue) === 0);
  }


  /**
   * fonctions qui activent le filtre des produits dans les formulaires de recherche de produits simples, composés et optionnels
   * doivent être appelées à l'initialisation de la page et à chaque fois que l'on veut rajouter ou supprimer un produit
   */

  private _setSearchSingleProductFormControlDataFiltered(i_index: number) {
    this.searchSingleProductFormControlDataFiltered[i_index] = this.searchSingleProductFormControls.controls[i_index]
      .valueChanges.pipe( startWith(''), map(value => this._filterSearchProductFormControlData(value)));
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
      this.quotationForm.controls.singleProduct.controls[i].patchValue(data[0]);
    });
  }
  // affecte le produit composé dans le formulaire de devis en fonction du nom de produit composé sélectionné dans les formulaires de recherche
  setCompositeProductFromSearchProductFormControl(i: number, idxPdt: number) {
    let compositeProductSearchElements = this.searchCompositeProductFormControls.controls[idxPdt].get('compositeProductSearchElements') as FormArray;
    fromArray([this._filterProducts(compositeProductSearchElements.controls[i].value)]).subscribe((data)=>{
       this.quotationForm.controls.compositeProducts.controls[idxPdt].controls.compositeProductElements.controls[i].patchValue(data[0]);
    });
  }
  // affecte le produit optionnel dans le formulaire de devis en fonction du nom de produit optionnel sélectionné dans les formulaires de recherche
  setOptionalProductFromSearchProductFormControl(i: number) {
    fromArray([this._filterProducts(this.searchOptionalProductFormControls.controls[i].value)]).subscribe((data)=>{
      this.quotationForm.controls.optionalProduct.controls[i].patchValue(data[0]);
    });
  }

  // retourne la première valeur de produit trouvé dans le tableau général des produits en fonction d'un nom de produit fourni en paramètre
  private _filterProducts(productName: string): ProductId[] {
    const filterValue = productName.toLowerCase();
    return this.productFormOptions.filter(productOption => productOption.name.toLowerCase().indexOf(filterValue) === 0);
  }

  /* used for add or remove single product*/
  get singleProduct() {
    return this.quotationForm.get('singleProduct') as FormArray;
  }

  addSingleProduct() {
    this.singleProduct.push(this.fb.control(''));
    this.quotationForm.value.singleProductAmount.push(1);
    this.searchSingleProductFormControls.push(this.fb.control(''));
    this._setSearchSingleProductFormControlDataFiltered(this.searchSingleProductFormControls.controls.length-1);
  }

  rmSingleProduct(i) {
    //console.log("rmSingleProduct : "+i);
    if (i > 0) {
      this.singleProduct.removeAt(Number(i));
      this.quotationForm.value.singleProductAmount.splice(Number(i),1);
      this.searchSingleProductFormControls.removeAt(Number(i));
      this.searchSingleProductFormControlDataFiltered.splice(i, 1);
    }
    else if (i === 0) {
      this.quotationForm.controls.singleProduct.controls[0].patchValue("");
      this.searchSingleProductFormControls.controls[0].patchValue("");
      this._setSearchSingleProductFormControlDataFiltered(0);
    }

  }

  private setSingleProductAmount(index: number, value: string) {
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
    this.quotationForm.value.specialProductPrice.push(0);
  }

  rmSpecialProduct(i) {
    this.specialProduct.removeAt(Number(i));
    this.quotationForm.value.specialProductPrice.splice(i, 1);
  }
  private setSpecialProductPrice(index: number, value: string) {
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
    this.searchOptionalProductFormControls.push(this.fb.control(''));
    this._setSearchOptionalProductFormControlDataFiltered(this.searchOptionalProductFormControls.controls.length-1);
  }

  rmOptionalProduct(i) {
    if (i > 0 ) {
      this.optionalProduct.removeAt(Number(i));
      this.quotationForm.value.optionalProductAmount.splice(Number(i),1);
      this.searchOptionalProductFormControls.removeAt(Number(i));
      this.searchOptionalProductFormControlDataFiltered.splice(i, 1);
    } else if (i === 0) {
      this.quotationForm.controls.optionalProduct.controls[0].patchValue("");
      this.searchOptionalProductFormControls.controls[0].patchValue("");
      this._setSearchOptionalProductFormControlDataFiltered(0);
    }
  }

  private setOptionalProductAmount(index: number, value: string) {
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
    let searchElement = this.fb.group({compositeProductSearchElements: this.fb.array([this.fb.control('')])});
    this.searchCompositeProductFormControls.push(searchElement);
    this._setSearchCompositeProductFormControlDataFiltered(this.searchCompositeProductFormControls.controls.length - 1, 0);
  }


  rmCompositeProduct(i) {
    if (i> 0) {
      this.compositeProducts.removeAt(Number(i));
      this.quotationForm.value.compositeProductAmount.splice(Number(i),1);
      this.searchCompositeProductFormControls.removeAt(Number(i));
      this.searchCompositeProductFormControlDataFiltered.splice(i, 1);
    }
  }

  private setCompositeProductAmount(index: number, value: string) {
    //console.log("createQuotationForm.compositeProductAmount :", this.createQuotationForm.value);
    this.quotationForm.value.compositeProductAmount[index] = Number(value);
    this.pricesFormManager.setPrices(this.computePriceService.computePrices(this.quotationForm.value)); // maj du prix (devrait être fait automatiquement par le subscribe du form : bug ?
  }

  addCompositeProductElement(idxPdt) {
    //console.log('compositeProductElements before ', this.compositeProducts);
    let compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    this.compositeProducts.value[idxPdt] = compositePdts.push(this.fb.control(''));
    let searchCompositePdts = this.searchCompositeProductFormControls.controls[idxPdt].get('compositeProductSearchElements') as FormArray;
    this.searchCompositeProductFormControls.value[idxPdt] = searchCompositePdts.push(this.fb.control(''));
    this._setSearchCompositeProductFormControlDataFiltered(idxPdt, searchCompositePdts.controls.length -1 );
  }

  rmCompositeProductElement(idxPdt,i) {
    //console.log("rmCompositeProductElement : "+i);
    let compositePdts = this.compositeProducts.controls[idxPdt].get('compositeProductElements') as FormArray;
    let searchCompositePdts = this.searchCompositeProductFormControls.controls[idxPdt].get('compositeProductSearchElements') as FormArray;
    if (i>0) {
      this.compositeProducts.value[idxPdt] = compositePdts.removeAt(Number(i));
      this.searchCompositeProductFormControls.value[idxPdt] = searchCompositePdts.removeAt(Number(i));
      this.searchCompositeProductFormControlDataFiltered[idxPdt].splice(i, 1);
      //console.log(this.searchCompositeProductFormControls.controls);
    } else if (i === 0) {
      this.compositeProducts.value[idxPdt] = compositePdts.controls[0].patchValue("");
      this.searchCompositeProductFormControls.value[idxPdt] = searchCompositePdts.controls[0].patchValue("");
      this._setSearchCompositeProductFormControlDataFiltered(idxPdt, 0);
    }
  }


  initForm() {
     this.quotationForm = this.quotationFormManager.getForm();
     this.quotationForm.valueChanges.subscribe(data => {
       //console.log('Form quotation changes', data);
       this.pricesFormManager.setPrices(this.computePriceService.computePrices(data));
       this._subscribeContactFromClient(data.client);
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


