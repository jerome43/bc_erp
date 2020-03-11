import { Component, OnInit} from '@angular/core';
import { AngularFirestore} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client } from '../client/client';
import {Subscription} from "rxjs";
import {Order} from "../order/order";

//export interface ClientId extends Client { id: string; }

@Component({
  selector: 'app-maintenance',
  templateUrl: './maintenance.component.html',
  styleUrls: ['./maintenance.component.less']
})

export class MaintenanceComponent implements OnInit {

  //private fbClients:Observable<ClientId[]>; // clients on Firebase
  //private fbClientsSubscription:Subscription;

  private fbOrders:Observable<any[]>; // orders on Firebase
  private fbOrdersSubscription:Subscription;

  constructor(private db:AngularFirestore) {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    //this.fbClientsSubscription.unsubscribe();
    this.fbOrdersSubscription.unsubscribe();
  }

  /*
  updateClients() { // modification des clients, enlève le champ discount et le remplace pâr rentalDiscount et saleDiscount
    this.fbClients = this.db.collection('clients').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Client;
        const id = a.payload.doc.id;
        return {id, ...data};
      })));
    if (this.fbClientsSubscription instanceof Subscription) {
      this.fbClientsSubscription.unsubscribe()
    }
    this.fbClientsSubscription = this.fbClients.subscribe((clients)=> {
      console.log('Current clients: ', clients);
      this.fbClientsSubscription.unsubscribe(); // évite de partir dans une boucle infinie car après on change des valeurs donc le subscribe repart en boucle

      for (var i=0; i<clients.length; i++) {
        if (clients[i].discount == undefined) {clients[i].discount = 0}
        const id = clients[i].id;
        const clientData = {
          name: clients[i].name,
          address: clients[i].address,
          zipcode: clients[i].zipcode,
          town: clients[i].town,
          country: clients[i].country,
          phone: clients[i].phone,
          contacts: clients[i].contacts,
          comment: clients[i].comment,
          rentalDiscount: clients[i].discount,
          saleDiscount: clients[i].discount,
          maintenance: clients[i].maintenance,
          date: clients[i].date,
        };
        this.updateClient(i, id, clientData);
      }
    });
  }

  updateClient(i, id, clientData) {
    //console.log('updateClient :', id, ' / ', clientData);
    //console.log(i, ' - updateClient :', id);
    var client = this.db.doc<Client>('clients/' + id );
    client.set(clientData).then(data => {
      console.log(i, " - Le client "+id+" a été mis à jour.")});
  }

   */

  updateOrders() { // modification des commandes, ajoute le champ advanceInvoiceDate
    this.fbOrders = this.db.collection('archived-orders').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Order;
        const id = a.payload.doc.id;
        return {id : id, order : data};
      })));
    if (this.fbOrdersSubscription instanceof Subscription) {
      this.fbOrdersSubscription.unsubscribe()
    }
    this.fbOrdersSubscription = this.fbOrders.subscribe((orders)=> {
      //console.log('Current orders: ', orders);
      this.fbOrdersSubscription.unsubscribe(); // évite de partir dans une boucle infinie car après on change des valeurs donc le subscribe repart en boucle

      for (let i=0; i<orders.length; i++) {
        if (orders[i].order.advanceInvoiceDate == undefined) {orders[i].order.advanceInvoiceDate = orders[i].order.orderDate}
        const id = orders[i].id;
        console.log(orders[i].id, ' : ', orders[i].order);
        this.updateOrder(i, id, orders[i].order);
      }
    });
  }

  updateOrder(i, id, orderData) {
    //console.log('updateOrder :', id, ' / ', orderData);
    //console.log(i, ' - updateClient :', id);
    let order = this.db.doc<Order>('archived-orders/' + id );
    order.set(orderData).then( () => {
      console.log(i, " - Le order "+id+" a été mis à jour.")});
  }

  wantUpdate() {
    //this.updateClients();
    this.updateOrders();
  }

}
