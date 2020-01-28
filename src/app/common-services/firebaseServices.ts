import {Injectable} from "@angular/core";
import {map} from "rxjs/operators";
import {Client} from "../client/client";
import {Product} from "../product/product";
import {Employe} from "../employe/employe";
import {AngularFirestore} from "@angular/fire/firestore";


@Injectable({
  providedIn: 'root'
})

export class FirebaseServices {

  constructor(private db: AngularFirestore) {
  }

  /**
   * get clients from firebase Database Firestore
   */
  public getClients() {
      return this.db.collection('clients')
        .snapshotChanges()
        .pipe(map(actions => actions.map(a => {
          const data = a.payload.doc.data() as Client;
          const id = a.payload.doc.id;
          return {id, ...data };
        })));
  }

  /**
   * get products from firebase Database Firestore
   */
  public getProducts() {
      return this.db.collection('products')
      .snapshotChanges()
      .pipe(map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Product;
        const id = a.payload.doc.id;
           return {id, ...data };
      })));
  }

  /**
   * get employees from firebase Database Firestore
   */
  public getEmployes() {
      return this.db.collection('employes')
        .snapshotChanges()
        .pipe(map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Employe;
        const id = a.payload.doc.id;
        return {id, ...data };
      })));
    }
}
