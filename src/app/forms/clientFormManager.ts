import {FormBuilder, Validators} from "@angular/forms";
import {Injectable} from "@angular/core";

@Injectable({
  providedIn: 'root'
})

export class ClientFormManager {
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
      name: ['', Validators.required],
      address: [''],
      zipcode: [''],
      town: [''],
      country: ['France'],
      phone: [''],
      //email: ['', [Validators.required, Validators.email]],
      contacts: this.fb.array([
        this.fb.group({
          contactName: [''],
          contactFunction: [''],
          contactPhone: [''],
          contactCellPhone: [''],
          contactEmail: ['', [Validators.email]]})
      ]),
      comment: [''],
      rentalDiscount: ['0'],
      saleDiscount: ['0'],
      maintenance: ['false'],
      date: [new Date()]
    })
  };

  public contactForm() {
    return this.fb.group({
      contactName: [''],
      contactFunction: [''],
      contactPhone: [''],
      contactCellPhone: [''],
      contactEmail: ['', [Validators.email]]})
  }
}
