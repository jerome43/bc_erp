import { Component, OnInit, OnDestroy, ViewChild, Inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatSort, MatPaginator, MatTableDataSource } from '@angular/material';
import { Order } from '../order';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Subscription } from "rxjs";

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
  public displayedColumns: string[] = ['id', 'quotationId', 'client', 'contact', 'orderDate', 'edit']; // colones affichées par le tableau
  private ordersData : Array<any>; // tableau qui va récupérer les données adéquates de fbOrders pour être ensuite affectées au tableau de sources de données
  public dataSource : MatTableDataSource<OrderId>; // source de données du tableau
  public orderTypeParams={path : "orders",isArchived:'false', displayInTemplate:"Commandes en cours"}; // les paramètres liés au type de commande (archivées ou courantes)

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore) {
  }

  ngOnInit() {
    this.route.paramMap.subscribe(() => {
      this.setOrderTypeParams();
      this.initFbOrders();
    });
  }

  ngOnDestroy() {
    this.fbOrdersSubscription.unsubscribe();
  }

  private setOrderTypeParams() {
    //console.log("isArchived :");
    if (this.route.snapshot.paramMap.get('archived') === "true") {
      this.orderTypeParams.path='archived-orders';
      this.orderTypeParams.isArchived='true';
      this.orderTypeParams.displayInTemplate= "Commandes archivées";
    } else {
      this.orderTypeParams.path='orders';
      this.orderTypeParams.isArchived='false';
      this.orderTypeParams.displayInTemplate = "Commandes en cours"
    }
  }

  private initFbOrders() {
    //console.log("initFbOrders");
    this.ordersData = [];
    this.dataSource = new MatTableDataSource<OrderId>(this.ordersData);
    //console.log("this.listInvoiceTitle.path",this.orderTypeParams.path);
    this.fbOrders = this.db.collection(this.orderTypeParams.path).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Order;
        const id = a.payload.doc.id;
        return {id, ...data };
      })));
    if (this.fbOrdersSubscription instanceof  Subscription) {this.fbOrdersSubscription.unsubscribe()}
    this.fbOrdersSubscription = this.fbOrders.subscribe((orders)=>{
      //console.log('Current orders: ', orders);
      this.ordersData = [];
      orders.forEach((order)=>{
        let quotationId;
        order.quotationId!=undefined ? quotationId = order.quotationId : quotationId="";
        this.ordersData.push({id : order.id, quotationId, client : order.client.name, contact : order.contact.contactName, orderDate : order.orderDate});
      });
      this.dataSource = new MatTableDataSource<OrderId>(this.ordersData);
      this.dataSource.paginator = this.paginator; // pagination du tableau
      //this.sort.sort(<MatSortable>({id: 'orderDate', start: 'desc'})); // pour trier sur la date les plus récentes
      this.dataSource.sort = this.sort; // tri sur le tableau
    });
  }

  public applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
  }

  public editOrder(eventTargetId) {
    //console.log(eventTargetId);
    this.router.navigate(['detail-order/'+eventTargetId, {archived: this.orderTypeParams.isArchived}]).then();
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
