import { Component, OnInit, OnDestroy, ViewChild} from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {MatSort, MatPaginator, MatTableDataSource} from '@angular/material';
import { Order } from '../order';
import { Router, ActivatedRoute } from '@angular/router';
import {Subscription} from "rxjs";
import {FormBuilder} from "@angular/forms";
import {ComputePriceService} from "../../price/compute-price.service";
import {UtilServices} from "../../common-services/utilServices";

export interface OrderId extends Order { id: string; }

@Component({
  selector: 'app-list-order',
  templateUrl: './list-invoice.component.html',
  styleUrls: ['./list-invoice.component.less']
})

export class ListInvoiceComponent implements OnInit, OnDestroy {
  private fbOrders: Observable<any>; // orders in Firebase
  private fbOrdersSubscription : Subscription;
  public formDates;
  public displayedColumns: string[] = ['id', 'client', 'orderDate', 'type', 'totalHT', 'totalTTC', 'invoiceInfos', 'marge', 'edit']; // colones affichées par le tableau
  private ordersData : Array<any>; // tableau qui va récupérer les données adéquates de fbOrders pour être ensuite affectées au tableau de sources de données
  public dataSource : MatTableDataSource<OrderId>; // source de données du tableau
  public listInvoiceTitle = "Factures Commandes en cours";

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private router: Router, private fb: FormBuilder, private route: ActivatedRoute, private db: AngularFirestore, private computePriceService : ComputePriceService ) {
  }

  ngOnInit() {
    this.initFbOrders();
    this.initFormDates();
  }

  ngOnDestroy() {
    this.fbOrdersSubscription.unsubscribe();
  }

  initFormDates() {
    this.formDates = this.fb.group({
      dateFrom: [''],
      dateTo: [''],
    });
  }

  initFbOrders() {
    //console.log("initFbOrders");
    this.ordersData = [];
    this.dataSource = new MatTableDataSource<any>(this.ordersData);
    this.fbOrders = this.db.collection('orders').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data();
        return {route : 'detail-order/', id : a.payload.doc.id, isArchived : false, ...data };
      })));
    if (this.fbOrdersSubscription instanceof  Subscription) {this.fbOrdersSubscription.unsubscribe()}
    this.fbOrdersSubscription = this.fbOrders.subscribe((orders)=>{
      //console.log('Current orders: ', orders);
      const fbServiceContracts = this.db.collection('service-contracts').snapshotChanges().pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data();
          return { route : 'detail-service-contract/', id : a.payload.doc.id, isArchived : false, ...data };
        }))).subscribe(serviceContracts => {
        fbServiceContracts.unsubscribe();
          const allOrders = orders.concat(serviceContracts);
          this.populateDataSource(allOrders);
        });
    });
  }

  populateDataSource(orders) {
    //console.log('Current orders: ', orders);
    this.ordersData = [];
    orders.forEach((order)=>{
      let invoiceInfos;
      order.paymentInvoice !== undefined ? invoiceInfos = {advance: {numero: order.numerosInvoice.advance, date: order.paymentInvoice.advance.date}, balance: { numero: order.numerosInvoice.balance, date: order.paymentInvoice.balance.date}} : invoiceInfos = {advance: {numero: order.numerosInvoice.advance, date: null}, balance: { numero: order.numerosInvoice.balance, date: null}};
      let price = this.computePriceService.computePrices(order);
      let marge;
      if (order.externalCosts === undefined) {
        marge = price.discountPrice;
      } else {
        marge = ComputePriceService.calcMarge(order.externalCosts, price.discountPrice);
      }
      if (order.advanceRate !== 0) {
        if (order.advanceRate === 100) {
          this.ordersData.push({route : order.route, id : order.id, client : order.client.name, orderDate : order.orderDate , type : 'acompte ' + order.advanceRate + ' %', invoiceInfos: invoiceInfos.advance, isArchived: order.isArchived, totalTTC : UtilServices.formatToTwoDecimal(price.discountPrice * 1.20 / 100 * order.advanceRate), totalHT: UtilServices.formatToTwoDecimal(price.discountPrice / 100 * order.advanceRate ), marge: marge});
        } else {
          this.ordersData.push({route : order.route, id : order.id, client : order.client.name, orderDate : order.orderDate , type : 'acompte ' + order.advanceRate + ' %', invoiceInfos: invoiceInfos.advance, isArchived: order.isArchived, totalTTC : UtilServices.formatToTwoDecimal(price.discountPrice * 1.20 / 100 * order.advanceRate), totalHT: UtilServices.formatToTwoDecimal(price.discountPrice / 100 * order.advanceRate ), marge: 'voir solde'});
        }
      }
      if (order.advanceRate !== 100)
      this.ordersData.push({route : order.route, id : order.id, client : order.client.name, orderDate : order.orderDate , type: 'solde ' + (100-order.advanceRate) + ' %', invoiceInfos: invoiceInfos.balance, isArchived: order.isArchived, totalTTC : UtilServices.formatToTwoDecimal((price.discountPrice * 1.20 / 100*(100-order.advanceRate)) - order.credit), totalHT: UtilServices.formatToTwoDecimal((price.discountPrice / 100 * ( 100 - order.advanceRate )) - order.credit), marge: marge});
    });
    this.dataSource = new MatTableDataSource<any>(this.ordersData);
    this.dataSource.paginator = this.paginator; // pagination du tableau
    //this.sort.sort(<MatSortable>({id: 'orderDate', start: 'desc'})); // pour trier sur la date les plus récentes
    this.dataSource.sort = this.sort; // tri sur le tableau
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
  }

  editOrder(route, id, isArchived) {
    //this.router.navigate(['detail-order/' + id, {archived: isArchived}]).then(() => {});
    this.router.navigate([route + id, {archived: isArchived}]).then(() => {});
  }

  wantOrdersByDate() {
    //console.log("wantOrdersByDate");
    this.listInvoiceTitle = "Factures commandes par date";
    this.selectOrderByDate(this.formDates.value.dateFrom, this.formDates.value.dateTo);
  }

  selectOrderByDate(dateFrom, dateTo) {
    if (dateFrom === undefined || dateFrom === '' || dateFrom === null || dateTo === undefined || dateTo === '' || dateTo === null) {
    }
    else {
      dateTo.setDate(dateTo.getDate() + 1);   // on rajoute 24h car la date de fin est les jour à 0h00 et non à 23h59h59
      //console.log("dateFrom : ", dateFrom, ' / dateTo : ', dateTo);
      const fbOrders = this.db.collection('orders', ref => ref
        .orderBy('orderDate')
        .startAt(dateFrom)
        .endAt(dateTo))
        .snapshotChanges()
        .pipe(map(actions => actions.map(a => {
          const data = a.payload.doc.data();
          return { route : 'detail-order/', id : a.payload.doc.id, isArchived : false, ...data };
          }))).subscribe(orders => {
            fbOrders.unsubscribe();
            //console.log("orders", orders);
            const fbArchivedOrders = this.db.collection('archived-orders', ref => ref
              .orderBy('orderDate')
              .startAt(dateFrom)
              .endAt(dateTo))
              .snapshotChanges()
              .pipe(map(actions => actions.map(a => {
                const data = a.payload.doc.data();
                return { route : 'detail-order/', id : a.payload.doc.id, isArchived : true, ...data };
                }))).subscribe(archivedOrders => {
                  fbArchivedOrders.unsubscribe();
                  const allOrders = orders.concat(archivedOrders);
                  const fbServiceContracts = this.db.collection('service-contracts', ref => ref
                    .orderBy('orderDate')
                    .startAt(dateFrom)
                    .endAt(dateTo))
                    .snapshotChanges()
                    .pipe(map(actions => actions.map(a => {
                      const data = a.payload.doc.data();
                      return { route : 'detail-service-contract/', id : a.payload.doc.id, isArchived : false, ...data };
                    }))).subscribe(serviceContracts => {
                      fbServiceContracts.unsubscribe();
                      //console.log("orders", orders);
                      const fbArchivedServiceContracts = this.db.collection('archived-service-contracts', ref => ref
                        .orderBy('orderDate')
                        .startAt(dateFrom)
                        .endAt(dateTo))
                        .snapshotChanges()
                        .pipe(map(actions => actions.map(a => {
                          const data = a.payload.doc.data();
                          return { route : 'detail-service-contract/', id : a.payload.doc.id, isArchived : true, ...data };
                        }))).subscribe(archivedServiceContracts => {
                          fbArchivedServiceContracts.unsubscribe();
                          const allServicesContract = serviceContracts.concat(archivedServiceContracts);
                          const allOrdersAndServiceContracts = allOrders.concat(allServicesContract);
                          this.populateDataSource(allOrdersAndServiceContracts);
                        });
                    });
                });
          });
      }
  }
}
