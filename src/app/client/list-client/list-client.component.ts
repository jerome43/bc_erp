import { Component, OnInit, OnDestroy, ViewChild, Inject } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {MatSort, MatPaginator, MatTableDataSource, MatSortable} from '@angular/material';
import { Client } from '../client';
import { Router } from '@angular/router';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs/index";

export interface DialogListClientData { message: string; displayNoButton:boolean }
export interface ClientId extends Client { id: string; }

@Component({
  selector: 'app-list-client',
  templateUrl: './list-client.component.html',
  styleUrls: ['./list-client.component.less']
})

export class ListClientComponent implements OnInit, OnDestroy {
  private fbClients: Observable<ClientId[]>; // clients on Firebase
  private fbClientsSubscription : Subscription;
  displayedColumns: string[] = ['name', 'date', 'edit', 'delete', 'id']; // colones affichées par le tableau
  private clientsData : Array<any>; // tableau qui va récupérer les données adéquates de fbClients pour être ensuite affectées au tableau de sources de données
  dataSource : MatTableDataSource<ClientId>; // source de données du tableau

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private router: Router, private db: AngularFirestore, private dialog: MatDialog) {
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
        return {id, ...data };
      })));
    if (this.fbClientsSubscription instanceof  Subscription) {this.fbClientsSubscription.unsubscribe()}
    this.fbClientsSubscription = this.fbClients.subscribe((clients)=>{
       console.log('Current clients: ', clients);
        this.clientsData = [];
        clients.forEach((client)=> {
          const id = client.id;
          const name = client.name;
          const date = client.date;
          this.clientsData.push({id, name, date});
        });
        console.log("this.clientsData : ", this.clientsData);
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
    console.log(eventTargetId);
    this.router.navigate(['detail-client/'+eventTargetId]);
  }

  wantDeleteClient(eventTargetId) {
    console.log("wantDeleteClient"+eventTargetId);
    this.openDialogWantDelete(eventTargetId, "Voulez-vous vraiment supprimer le client "+eventTargetId+" ?")
  }

  openDialogWantDelete(id, message): void {
    const dialogRef = this.dialog.open(DialogListClientOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed'+result);
      if (result=='yes') {
        this.deleteClient(id);
      }
    });
  }


  deleteClient(eventTargetId) {
    console.log("deleteClient"+eventTargetId);
    this.clientsData = [];
    this.db.doc("clients/"+eventTargetId).delete().then(data => {
      this.openDialogDelete("Le client "+eventTargetId+" a été supprimé.")
    });
  }

  openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogListClientOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
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


