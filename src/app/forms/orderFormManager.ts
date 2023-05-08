import {FormBuilder, Validators} from "@angular/forms";
import {Injectable} from "@angular/core";
import {UtilServices} from "../common-services/utilServices";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;

@Injectable({
  providedIn: 'root'
})

export class OrderFormManager {

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
      dismountingDate: [''],
      orderDate: ['', Validators.required],
      scanOrder: [''],
      advanceInvoiceDate: [''],
      balanceInvoiceDate: [''],
      orderComment: [''],
      deliveryComment: [''],
      advanceRate:[0],
      numerosInvoice: [{advance :null, balance : null}],
      credit: [0],
      paymentInvoice: [{advance: {amount: null, date: null}, balance: { amount: null, date: null}}], // introduce in january 2020
      externalCosts : this.fb.array([
        this.fb.control({ name : '', amount : 0 }) // introduce in january 2020
      ]),
    })
  };

  public setPaymentInvoice(prices) {
    this.form.value.paymentInvoice.advance.amount = UtilServices.formatToTwoDecimal(prices.discountPrice / 100 * this.form.value.advanceRate);
    this.form.value.paymentInvoice.balance.amount = UtilServices.formatToTwoDecimal((prices.discountPrice / 100 * ( 100 - this.form.value.advanceRate )) - (this.form.value.credit/1.2));
  }

  public patchDates(order) {
    // convert from TimeStamp (saved in firebase) to Date (used by angular DatePicker)
    if (order.rentDateFrom instanceof Timestamp) {this.form.controls['rentDateFrom'].patchValue(order.rentDateFrom.toDate())}
    if (order.rentDateTo instanceof Timestamp) {this.form.controls['rentDateTo'].patchValue(order.rentDateTo.toDate())}
    if (order.immoDateFrom instanceof Timestamp) {this.form.controls['immoDateFrom'].patchValue(order.immoDateFrom.toDate())}
    if (order.immoDateTo instanceof Timestamp) {this.form.controls['immoDateTo'].patchValue(order.immoDateTo.toDate())}
    if (order.orderDate instanceof Timestamp) {this.form.controls['orderDate'].patchValue(order.orderDate.toDate())}
    if (order.relaunchClientDate instanceof Timestamp) {this.form.controls['relaunchClientDate'].patchValue(order.relaunchClientDate.toDate())}
    if (order.installationDate instanceof Timestamp) {this.form.controls['installationDate'].patchValue(order.installationDate.toDate())}
    if (order.dismountingDate instanceof Timestamp) {this.form.controls['dismountingDate'].patchValue(order.dismountingDate.toDate())}
    if (order.advanceInvoiceDate instanceof Timestamp) {this.form.controls['advanceInvoiceDate'].patchValue(order.advanceInvoiceDate.toDate())}
    if (order.balanceInvoiceDate instanceof Timestamp) {this.form.controls['balanceInvoiceDate'].patchValue(order.balanceInvoiceDate.toDate())}
    if (order.paymentInvoice) { // pour assurer rétrocompatibilité données avant janvier 2020
      if (order.paymentInvoice.advance.date instanceof Timestamp) {
        const paymentInvoice = {advance: {amount: order.paymentInvoice.advance.amount, date: order.paymentInvoice.advance.date.toDate()}, balance: { amount: order.paymentInvoice.balance.amount, date: order.paymentInvoice.balance.date}};
        this.form.controls['paymentInvoice'].patchValue(paymentInvoice)
      }
      if (order.paymentInvoice.balance.date instanceof Timestamp) {
        const paymentInvoice = {advance: {amount: order.paymentInvoice.advance.amount, date: this.form.controls['paymentInvoice'].value.advance.date}, balance: { amount: order.paymentInvoice.balance.amount, date: order.paymentInvoice.balance.date.toDate()}};
        this.form.controls['paymentInvoice'].patchValue(paymentInvoice)
      }
    }
  }

}
