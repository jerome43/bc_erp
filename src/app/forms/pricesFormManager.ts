import {FormBuilder} from "@angular/forms";
import {Injectable} from "@angular/core";

@Injectable({
  providedIn: 'root'
})

export class PricesFormManager {

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
      price: [0], // le prix de base
      rentalDiscount: [0],// le % de remise sur locations
      saleDiscount: [0],// le % de remise sur vente
      discountPrice: [0], // le prix une fois la remise appliquée
    });
  };

  public setPrices(prices) {
    this.form.value.price = prices.price;
    this.form.value.rentalDiscount= prices.rentalDiscount;
    this.form.value.saleDiscount= prices.saleDiscount;
    this.form.value.discountPrice = prices.discountPrice;
  }
}
