import {FormBuilder, Validators} from "@angular/forms";
import {Injectable} from "@angular/core";
import {ProductType} from "../product/ProductType";
import {ProductStatus} from "../product/ProductStatus";

@Injectable({
  providedIn: 'root'
})

export class ProductFormManager {
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
      description: [''],
      internal_number: ['', Validators.required],
      stock: ['1', Validators.required],
      type: [ProductType.rental, Validators.required],
      //status: [ProductStatus.Available, Validators.required],// ajouté le 08/05/2023 puis retiré le 16/08/2023
      productItems: this.fb.array([this.fb.group({number: [''], status: [ProductStatus.Available]})]),// ajouté le 16/08/2023
      sell_price : [0, Validators.required],
      rent_price : [0, Validators.required],
      apply_degressivity: ['true', Validators.required],
      photo: [''],
      comment: [''],
      date: [new Date()]
    });
  };
}
