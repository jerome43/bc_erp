import {FormBuilder, Validators} from "@angular/forms";
import {Injectable} from "@angular/core";
import {UtilServices} from "../common-services/utilServices";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;

@Injectable({
  providedIn: 'root'
})

export class QuotationServiceContractFormManager {

  private readonly form;

  private fb : FormBuilder;

  constructor() {
    this.fb = new FormBuilder();
    this.form = this.createForm();
  }

  public getForm() {
    return this.form;
  }

  private createForm() {
    return this.fb.group({
      client: ['', Validators.required],
      contact: [{
        contactName : "",
        contactFunction : "",
        contactPhone : "",
        contactCellPhone : "",
        contactEmail : "",
      }],
      referenceClient : [''],
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
      rentDateFrom: [''],
      rentDateTo: [''],
      immoDateFrom: [''],
      immoDateTo: [''],
      quotationComment: [''],
      privateQuotationComment: [''],
      quotationDate: [''],
      clientOrderNumber : [''],
      relaunchClientDate:[''],
      installationAddress: [''],
      installationZipcode: [''],
      installationTown: [''],
      installationDate: [''],
      dismountingDate: [''],
      installationHours: [''],
      installationContactName: [''],
      installationContactPhone: [''],
      fromServiceContractId: [''],
    });
  };

  public patchDates(serviceContract) {
    // convert from TimeStamp (saved in firebase) to Date (used by angular DatePicker)
    if (serviceContract.rentDateFrom instanceof Timestamp) {this.form.controls['rentDateFrom'].patchValue(serviceContract.rentDateFrom.toDate())}
    if (serviceContract.rentDateTo instanceof Timestamp) {this.form.controls['rentDateTo'].patchValue(serviceContract.rentDateTo.toDate())}
    if (serviceContract.immoDateFrom instanceof Timestamp) {this.form.controls['immoDateFrom'].patchValue(serviceContract.immoDateFrom.toDate())}
    if (serviceContract.immoDateTo instanceof Timestamp) {this.form.controls['immoDateTo'].patchValue(serviceContract.immoDateTo.toDate())}
    if (serviceContract.quotationDate instanceof Timestamp) {this.form.controls['quotationDate'].patchValue(serviceContract.quotationDate.toDate())}
    if (serviceContract.relaunchClientDate instanceof Timestamp) {this.form.controls['relaunchClientDate'].patchValue(serviceContract.relaunchClientDate.toDate())}
    if (serviceContract.installationDate instanceof Timestamp) {this.form.controls['installationDate'].patchValue(serviceContract.installationDate.toDate())}
    if (serviceContract.dismountingDate instanceof Timestamp) {this.form.controls['dismountingDate'].patchValue(serviceContract.dismountingDate.toDate())}
  }
}
