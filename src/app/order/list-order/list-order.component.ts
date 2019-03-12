import { Component, OnInit, OnDestroy, ViewChild, Inject } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {MatSort, MatPaginator, MatTableDataSource, MatSortable} from '@angular/material';
import { FormControl, FormBuilder } from '@angular/forms';
import { Order } from '../order';
import { Router, ActivatedRoute } from '@angular/router';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs/index";

export interface DialogListOrderData { message: string; displayNoButton:boolean }
export interface OrderId extends Order { id: string; }

@Component({
  selector: 'app-list-order',
  templateUrl: './list-order.component.html',
  styleUrls: ['./list-order.component.less']
})

export class ListOrderComponent implements OnInit, OnDestroy {
  private fbOrders: Observable<OrderId[]>; // produtcs on Firebase
  private fbOrdersSubscription : Subscription;
  //private displayedColumns: string[] = ['id', 'client', 'contact', 'orderDate', 'edit', 'delete']; // colones affichées par le tableau
  private displayedColumns: string[] = ['id', 'client', 'contact', 'orderDate', 'edit']; // colones affichées par le tableau
  private ordersData : Array<any>; // tableau qui va récupérer les données adéquates de fbOrders pour être ensuite affectées au tableau de sources de données
  private dataSource : MatTableDataSource<OrderId>; // source de données du tableau
  private orderTypeParams={path : "orders",isArchived:'false', displayInTemplate:"Commandes en cours"}; // les paramètres liés au type de commande (archivées ou courantes)

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore, private dialog: MatDialog, private fb: FormBuilder) {
  }

  ngOnInit() {
    // subscribe to the parameters observable
    this.route.paramMap.subscribe(params => {
      console.log(params.get('archived'));
      this.setOrderTypeParams(this.isArchived());
      this.initFbOrders();
    });
  }

  ngOnDestroy() {
    this.fbOrdersSubscription.unsubscribe();
  }

  isArchived(): boolean {
    var isArchived;
    this.route.snapshot.paramMap.get('archived')==="true" ? isArchived = true : isArchived = false;
    return isArchived;
  }

  setOrderTypeParams(isArchived:boolean) {
    console.log("isArchived :" + isArchived);
    if (isArchived) {
      this.orderTypeParams.path='archived-orders';
      this.orderTypeParams.isArchived='true';
      this.orderTypeParams.displayInTemplate= "Commandes archivées";
    }
    else {
      this.orderTypeParams.path='orders';
      this.orderTypeParams.isArchived='false';
      this.orderTypeParams.displayInTemplate = "Commandes en cours"
    }
  }

  initFbOrders() {
    console.log("initFbOrders");
    this.ordersData = [];
    this.dataSource = new MatTableDataSource<OrderId>(this.ordersData);
    console.log("this.orderTypeParams.path",this.orderTypeParams.path);
    this.fbOrders = this.db.collection(this.orderTypeParams.path).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Order;
        const id = a.payload.doc.id;
        return {id, ...data };
      })));
    if (this.fbOrdersSubscription instanceof  Subscription) {this.fbOrdersSubscription.unsubscribe()}
    this.fbOrdersSubscription = this.fbOrders.subscribe((orders)=>{
      console.log('Current orders: ', orders);
      this.ordersData = [];
      orders.forEach((order)=>{
        const client = order.client.name;
        const contact = order.contact.contactName;
        const orderDate = order.orderDate;
        const id = order.id;
        this.ordersData.push({id, client, contact, orderDate});
      });
      this.dataSource = new MatTableDataSource<OrderId>(this.ordersData);
      this.dataSource.paginator = this.paginator; // pagination du tableau
      //this.sort.sort(<MatSortable>({id: 'orderDate', start: 'desc'})); // pour trier sur la date les plus récentes
      this.dataSource.sort = this.sort; // tri sur le tableau
    });
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
  }

  editOrder(eventTargetId) {
    console.log(eventTargetId);
    this.router.navigate(['detail-order/'+eventTargetId, {archived: this.orderTypeParams.isArchived}]);
  }

  wantDeleteOrder(eventTargetId) {
    console.log("wantDeleteOrder"+eventTargetId);
    this.openDialogWantDelete(eventTargetId, "Voulez-vous vraiment supprimer la commande "+eventTargetId+" ?")
  }

  openDialogWantDelete(id, message): void {
    const dialogRef = this.dialog.open(DialogListOrderOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed'+result);
      if (result=='yes') {
        this.deleteOrder(id);
      }
    });
  }

  deleteOrder(eventTargetId) { // pour supprimer la commande dans firebase
    console.warn("deleteOrder : "+eventTargetId);
    const orderDoc: AngularFirestoreDocument<Order> = this.db.doc<Order>(this.orderTypeParams.path +'/' + eventTargetId );
    orderDoc.ref.get().then((order)=>{
      if (order.exists) {
        this.ordersData = []; // on vide au préalable le tableau sinon les documents vont se surajouter aux anciens
        // supression du commande dans firestore
        orderDoc.delete().then(data => {
          this.openDialogDelete("La commande "+eventTargetId+" a été supprimée.")});
      }
      else {
        console.log("order doesn't exists");
      }
    });
  }

  openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogListOrderOverview, {
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
  selector: 'dialog-list-order-overview',
  templateUrl: 'dialog-list-order-overview.html',
})
export class DialogListOrderOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogListOrderOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogListOrderData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
