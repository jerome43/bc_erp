import {FormBuilder, Validators} from "@angular/forms";
import {Injectable} from "@angular/core";

@Injectable({
  providedIn: 'root'
})

export class EmployeFormManager {
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
      phone: ['', Validators.required],
      cellPhone: [''],
      email: ['', [Validators.required, Validators.email]],
      date: [new Date()]
    })
  };

}
