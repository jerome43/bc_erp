import { Component, OnInit, OnDestroy, ViewChild, Inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {MatSort, MatPaginator, MatTableDataSource } from '@angular/material';
import { Client } from '../client';
import { Router } from '@angular/router';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs";
import {ExportCsvService} from "../../export/export-csv.service";
import {AppComponent, UserRights} from "../../app.component";

export interface DialogListClientData { message: string; displayNoButton:boolean }
export interface ClientId extends Client { id: string; }

@Component({
  selector: 'app-list-client',
  templateUrl: './list-client.component.html',
  styleUrls: ['./list-client.component.less']
})

export class ListClientComponent implements OnInit, OnDestroy {
  public userRights = UserRights;
  public rights;
  private fbClients: Observable<ClientId[]>; // clients on Firebase
  private fbClientsSubscription: Subscription;
  displayedColumns: string[] = ['name', 'date', 'edit', 'delete', 'id']; // colones affichées par le tableau
  private clientsData: Array<any>; // tableau qui va récupérer les données adéquates de fbClients pour être ensuite affectées au tableau de sources de données
  dataSource: MatTableDataSource<ClientId>; // source de données du tableau

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private router: Router,
              private db: AngularFirestore,
              private dialog: MatDialog,
              private exportCsvService: ExportCsvService,
              private appComponent : AppComponent
              ) {
    this.rights = this.appComponent.rights
  }

  ngOnInit() {
    this.initListClients();
  }

  ngOnDestroy() {
    this.fbClientsSubscription.unsubscribe();
  }

  initListClients() {
    this.fbClients = this.db.collection('clients').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Client;
        const id = a.payload.doc.id;
        return {id, ...data};
      })));
    if (this.fbClientsSubscription instanceof Subscription) {
      this.fbClientsSubscription.unsubscribe()
    }
    this.fbClientsSubscription = this.fbClients.subscribe((clients) => {
      //console.log('Current clients: ', clients);
      this.clientsData = [];
      clients.forEach((client) => {
        const id = client.id;
        const name = client.name;
        const date = client.date;
        this.clientsData.push({id, name, date});
      });
      //console.log("this.clientsData : ", this.clientsData);
      this.dataSource = new MatTableDataSource<ClientId>(this.clientsData);
      this.dataSource.paginator = this.paginator; // pagination du tableau
      //this.sort.sort(<MatSortable>({id: 'name', start: 'desc'})); // pour trier sur les noms par ordre alphabétique
      this.dataSource.sort = this.sort; // tri sur le tableau
    });
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
  }

  editClient(eventTargetId) {
    //console.log(eventTargetId);
    this.router.navigate(['detail-client/' + eventTargetId]).then();
  }

  wantDeleteClient(eventTargetId) {
    //console.log("wantDeleteClient"+eventTargetId);
    this.openDialogWantDelete(eventTargetId, "Voulez-vous vraiment supprimer le client " + eventTargetId + " ?")
  }

  openDialogWantDelete(id, message): void {
    const dialogRef = this.dialog.open(DialogListClientOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      //console.log('The dialog was closed'+result);
      if (result == 'yes') {
        this.deleteClient(id);
      }
    });
  }


  deleteClient(eventTargetId) {
    //console.log("deleteClient"+eventTargetId);
    this.clientsData = [];
    this.db.doc("clients/" + eventTargetId).delete().then(() => {
      this.openDialogDelete("Le client " + eventTargetId + " a été supprimé.")
    });
  }

  openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogListClientOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton: false
      }
    });

    dialogRef.afterClosed().subscribe();
  }

  exportClientCsv() {
    //console.log("exportClientCsv");
    this.db.collection('clients').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Client;
        const id = a.payload.doc.id;
        return {id, ...data};
      })))
      .subscribe((clients) => {
        // console.log('Current clients: ', clients);
        const clientsData = [];
        clients.forEach((client: any) => {
          for (let i=0; i<client.contacts.length; i++) {
            clientsData.push({
              id: client.id,
              nom_client: client.name,
              adresse_client: client.address,
              code_postal_client: client.zipcode,
              ville_client: client.town,
              pays_client: client.country,
              telephone_client: client.phone,
              commentaire_client : client.comment,
              maintenance_client: client.maintenance,
              taux_remise_location_client: client.rentalDiscount,
              tauxremise_vente_client: client.saleDiscount,
              nom_contact: client.contacts[i].contactName,
              email_contact: client.contacts[i].contactEmail,
              tel_contact: client.contacts[i].contactPhone,
              tel_port_contact: client.contacts[i].contactCellPhone,
              fonction_contact: client.contacts[i].contactFunction,
            });
          }
        });
        ExportCsvService.exportCSVFile(
          ['id', 'nom_client', 'adresse_client', 'code_postal_client',
            'ville_client', 'pays_client', 'telephone_client', 'commentaire_client', 'maintenance_client',
            'taux_remise_location_client', 'taux_remise_vente_client', 'nom_contact', 'email_contact',
            'tel_contact', 'tel_port_contact', 'fonction_contact'],
          clientsData,
          'client');
      })
  }

}

@Component({
  selector: 'dialog-list-client-overview',
  templateUrl: 'dialog-list-client-overview.html',
})
export class DialogListClientOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogListClientOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogListClientData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}


