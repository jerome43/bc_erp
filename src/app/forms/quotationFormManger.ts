import {FormArray, FormBuilder, Validators} from "@angular/forms";
import {Injectable} from "@angular/core"
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;

@Injectable({
  providedIn: 'root'
})

export class QuotationFormManger {

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
      optionalProductAmount: [[1]],
      optionalProduct: this.fb.array([
        this.fb.control('')
      ]),
      optionalLongRentalMonth : [0],
      optionalLongRentalPrice : [0],
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
  };

  public patchDates(quotation) {
    // convert from TimeStamp (saved in firebase) to Date (used by angular DatePicker)
    if (quotation.rentDateFrom instanceof Timestamp) {this.form.controls['rentDateFrom'].patchValue(quotation.rentDateFrom.toDate())}
    if (quotation.rentDateTo instanceof Timestamp) {this.form.controls['rentDateTo'].patchValue(quotation.rentDateTo.toDate())}
    if (quotation.immoDateFrom instanceof Timestamp) {this.form.controls['immoDateFrom'].patchValue(quotation.immoDateFrom.toDate())}
    if (quotation.immoDateTo instanceof Timestamp) {this.form.controls['immoDateTo'].patchValue(quotation.immoDateTo.toDate())}
    if (quotation.quotationDate instanceof Timestamp) {this.form.controls['quotationDate'].patchValue(quotation.quotationDate.toDate())}
    if (quotation.relaunchClientDate instanceof Timestamp) {this.form.controls['relaunchClientDate'].patchValue(quotation.relaunchClientDate.toDate())}
    if (quotation.installationDate instanceof Timestamp) {this.form.controls['installationDate'].patchValue(quotation.installationDate.toDate())}
    // alternative solution
    //const timestamp = quotation.quotationDate.seconds*1000;
    //quotation.quotationDate = new Date(timestamp);
  }

}
