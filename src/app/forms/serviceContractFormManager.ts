import {FormBuilder, Validators} from "@angular/forms";
import {Injectable} from "@angular/core";
import {UtilServices} from "../common-services/utilServices";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;

@Injectable({
  providedIn: 'root'
})

export class ServiceContractFormManager {

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
      credit: [0],
      paymentInvoice: [{advance: {amount: null, date: null}, balance: { amount: null, date: null}}], // introduce in january 2020
      externalCosts : this.fb.array([
        this.fb.control({ name : '', amount : 0 }) // introduce in january 2020
      ]),
      tickets : this.fb.array([this.fb.group({
        ticketElements: this.fb.array([this.fb.control( {comment : "", date : null, author: null})]),
        }
      )]),
    });
  };

  public setPaymentInvoice(prices) {
    this.form.value.paymentInvoice.advance.amount = UtilServices.formatToTwoDecimal(prices.discountPrice / 100 * this.form.value.advanceRate);
    this.form.value.paymentInvoice.balance.amount = UtilServices.formatToTwoDecimal((prices.discountPrice / 100 * ( 100 - this.form.value.advanceRate )) - this.form.value.credit);
  }

  public patchDates(serviceContract) {
    // convert from TimeStamp (saved in firebase) to Date (used by angular DatePicker)
    if (serviceContract.rentDateFrom instanceof Timestamp) {this.form.controls['rentDateFrom'].patchValue(serviceContract.rentDateFrom.toDate())}
    if (serviceContract.rentDateTo instanceof Timestamp) {this.form.controls['rentDateTo'].patchValue(serviceContract.rentDateTo.toDate())}
    if (serviceContract.immoDateFrom instanceof Timestamp) {this.form.controls['immoDateFrom'].patchValue(serviceContract.immoDateFrom.toDate())}
    if (serviceContract.immoDateTo instanceof Timestamp) {this.form.controls['immoDateTo'].patchValue(serviceContract.immoDateTo.toDate())}
    if (serviceContract.orderDate instanceof Timestamp) {this.form.controls['orderDate'].patchValue(serviceContract.orderDate.toDate())}
    if (serviceContract.relaunchClientDate instanceof Timestamp) {this.form.controls['relaunchClientDate'].patchValue(serviceContract.relaunchClientDate.toDate())}
    if (serviceContract.installationDate instanceof Timestamp) {this.form.controls['installationDate'].patchValue(serviceContract.installationDate.toDate())}
    if (serviceContract.balanceInvoiceDate instanceof Timestamp) {this.form.controls['balanceInvoiceDate'].patchValue(serviceContract.balanceInvoiceDate.toDate())}
    if (serviceContract.paymentInvoice) { // pour assurer rétrocompatibilité données avant janvier 2020
      if (serviceContract.paymentInvoice.advance.date instanceof Timestamp) {
        const paymentInvoice = {advance: {amount: serviceContract.paymentInvoice.advance.amount, date: serviceContract.paymentInvoice.advance.date.toDate()}, balance: { amount: serviceContract.paymentInvoice.balance.amount, date: serviceContract.paymentInvoice.balance.date}};
        this.form.controls['paymentInvoice'].patchValue(paymentInvoice)
      }
      if (serviceContract.paymentInvoice.balance.date instanceof Timestamp) {
        const paymentInvoice = {advance: {amount: serviceContract.paymentInvoice.advance.amount, date: this.form.controls['paymentInvoice'].value.advance.date}, balance: { amount: serviceContract.paymentInvoice.balance.amount, date: serviceContract.paymentInvoice.balance.date.toDate()}};
        this.form.controls['paymentInvoice'].patchValue(paymentInvoice)
      }
    }
  }
}
