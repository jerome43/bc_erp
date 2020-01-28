import {Component, OnInit} from '@angular/core';
import {Observable, Subscription} from "rxjs";
import {Contact} from "../../client/contact";
import {AngularFirestore} from "@angular/fire/firestore";
import {ActivatedRoute, Router} from "@angular/router";
import {FormArray, FormBuilder} from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import {AngularFireStorage} from "@angular/fire/storage";
import {PdfService} from "../../pdf/pdf.service";
import {ComputePriceService} from "../../price/compute-price.service";
import {fromArray} from "rxjs/internal/observable/fromArray";

import {
  ClientId,
  DialogDetailServiceContractOverview,
  EmployeId,
  ProductId,
} from "../detail-service-contract/detail-service-contract.component";
import {ServiceContractFormManager} from "../../forms/serviceContractFormManager";
import {PricesFormManager} from "../../forms/pricesFormManager";
import {FirebaseServices} from "../../common-services/firebaseServices";


@Component({
  selector: 'app-create-service-contract',
  templateUrl: './create-service-contract.component.html',
  styleUrls: ['./create-service-contract.component.less']
})

export class CreateServiceContractComponent implements OnInit {

  // for client
  private fbClientsSubscription : Subscription; // then we can unsubscribe after having subscribe
  private clientFormOptions; // used by autoocmplete client form
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

  // for ServiceContract and global form
  public serviceContractForm;
  public pricesForm;
  public serviceContractId: string;
  private indexNumeroInvoice:number;

  private numeroServiceContract : number;
  private serviceContractFormManager : ServiceContractFormManager;
  private pricesFormManager : PricesFormManager;

  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore,
              private fb: FormBuilder, private dialog: MatDialog, private storage: AngularFireStorage,
              private pdfService: PdfService, private computePriceService: ComputePriceService,
              private firebaseServices : FirebaseServices) {
    this.serviceContractFormManager = new ServiceContractFormManager();
    this.pricesFormManager = new PricesFormManager();
  }

  ngOnInit() {
    this.serviceContractId = this.route.snapshot.paramMap.get('serviceContractId');
    this.initForm();
    this.observeIndexNumeroInvoice();
    this.observeNumeroServiceContract();

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
    this.fbClientsSubscription.unsubscribe();
    this.fbProductsSubscription.unsubscribe();
    this.fbEmployesSubscription.unsubscribe();
  }

  observeNumeroServiceContract() {
    //console.log("observeNumeroServiceContract : ");
    this.db.doc<any>('parameters/numeroServiceContract').valueChanges().subscribe(
      numeroServiceContract => {
        this.numeroServiceContract = numeroServiceContract.index;
        //console.log("observeNumeroServiceContract Subscribe : ", this.numeroServiceContract);
      });
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
        let contacts:[Contact];
        if (client[0]!=undefined && client[0].contacts !=undefined && client.length==1) {// si longueur >1, c'est qu'il y a plusieurs résultats de clients possible, donc on ne charge pas de contacts
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

  /**
   * save form in database as serviceContract
   */
  addServiceContract() {
    //console.log("addQuotation", this.serviceContractForm.value);
    const id = this.numeroServiceContract+1;
    this.db.collection('service-contracts').doc(id.toString()).set(this.serviceContractForm.value).then(()=> {
      //console.log("Quotation written with ID: ", id);
      this.db.collection('parameters').doc("numeroServiceContract").update({index: id}).then();
      this.openAddServiceContractDialog(id)}).
    catch(function(error) {
      console.error("Error adding document: ", error);
    });
  }

  openAddServiceContractDialog(id): void {
    const dialogRef = this.dialog.open(DialogDetailServiceContractOverview, {
      width: '450px',
      data: {message: "Le contrat de maintenance a bien été enregistré sous le numéro " + id}
    });
    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['detail-service-contract/'+id, {archived: false}]).then();
    });
  }

  private setPrices() {
    const prices = this.computePriceService.computePrices(this.serviceContractForm.value);
    this.pricesFormManager.setPrices(prices);
    this.serviceContractFormManager.setPaymentInvoice(prices);
  }

}
