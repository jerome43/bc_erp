import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client } from '../client/client';
import { Router } from '@angular/router';
import {Subscription} from "rxjs/index";

export interface ClientId extends Client { id: string; }

@Component({
  selector: 'app-maintenance',
  templateUrl: './maintenance.component.html',
  styleUrls: ['./maintenance.component.less']
})

export class MaintenanceComponent implements OnInit {

  private fbClients:Observable<ClientId[]>; // clients on Firebase
  private fbClientsSubscription:Subscription;

  constructor(private db:AngularFirestore) {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.fbClientsSubscription.unsubscribe();
  }

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
    //onsole.log('updateClient :', id, ' / ', clientData);
    //console.log(i, ' - updateClient :', id);
    var client = this.db.doc<Client>('clients/' + id );
    client.set(clientData).then(data => {
      console.log(i, " - Le client "+id+" a été mis à jour.")});
  }

  wantUpdateClient() {
    this.updateClients();
  }

}
