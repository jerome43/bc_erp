import {Component, Inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {Observable, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {MatPaginator, MatSort, MatTableDataSource} from '@angular/material';
import {Order} from '../order';
import {ActivatedRoute, Router} from '@angular/router';
import {FormBuilder} from "@angular/forms";
import {ComputePriceService} from "../../price/compute-price.service";
import {UtilServices} from "../../common-services/utilServices";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;
import {ExportCsvService} from "../../export/export-csv.service";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {DialogListInvoiceData} from "../list-invoice/list-invoice.component";

export interface OrderId extends Order { id: string; }

export interface DialogListInvoiceData {
  message: string;
  displayNoButton:boolean;
}

@Component({
  selector: 'app-list-order',
  templateUrl: './list-invoice.component.html',
  styleUrls: ['./list-invoice.component.less']
})

export class ListInvoiceComponent implements OnInit, OnDestroy {
  private fbOrders: Observable<any>; // orders in Firebase
  private fbOrdersSubscription : Subscription;
  public formDates;
  public displayedColumns: string[] = ['numeroInvoice', 'dateInvoice', 'client', 'id', 'orderDate', 'type', 'totalHT', 'totalTTC', 'invoiceInfos', 'externalCosts', 'marge', 'credit', 'edit']; // colones affichées par le tableau
  private ordersData : Array<any>; // tableau qui va récupérer les données adéquates de fbOrders pour être ensuite affectées au tableau de sources de données
  public dataSource : MatTableDataSource<OrderId>; // source de données du tableau
  public listInvoiceTitle = "Factures Commandes en cours";
  public stats: {totalTTC : number, totalHT: number, externalCosts: number, totalMarge:number, totalDu:number, credit:number}
  = {totalTTC : 0, totalHT:0, externalCosts: 0, totalMarge:0, totalDu:0, credit:0}; // principaux totaux des factures sélectionnées de date à date

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private router: Router, private fb: FormBuilder, private route: ActivatedRoute,
              private db: AngularFirestore, private computePriceService : ComputePriceService,
              private exportCsvService: ExportCsvService,
              private dialog: MatDialog) {
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
          this.populateDefaultDataSource(allOrders);
        });
    });
  }

  populateDefaultDataSource(orders) {
    //console.log('Current orders: ', orders);
    this.ordersData = [];
    orders.forEach((order)=>{
      let invoiceInfos;
      order.paymentInvoice !== undefined ? invoiceInfos = {advance: {numero: order.numerosInvoice.advance, date: order.paymentInvoice.advance.date}, balance: { numero: order.numerosInvoice.balance, date: order.paymentInvoice.balance.date}} : invoiceInfos = {advance: {numero: order.numerosInvoice.advance, date: null}, balance: { numero: order.numerosInvoice.balance, date: null}};
      let price = this.computePriceService.computePrices(order);
      let marge;
      let externalCosts: number = 0;
      if (order.externalCosts === undefined) {
        marge = price.discountPrice;
      } else {
        marge = ComputePriceService.calcMarge(order.externalCosts, price.discountPrice);
        externalCosts = ComputePriceService.getExternalCost(order.externalCosts);
      }
      if (order.advanceRate !== 0 && order.advanceRate !== null) {
        let dateInvoice;
        order.advanceInvoiceDate instanceof Timestamp ? dateInvoice = order.advanceInvoiceDate.toDate().toLocaleDateString() : dateInvoice ='';
        this.ordersData.push({route : order.route, numeroInvoice : order.numerosInvoice.advance, dateInvoice, id : order.id, client : order.client.name, orderDate : order.orderDate , type : 'acompte ' + order.advanceRate + ' %', invoiceInfos: invoiceInfos.advance, isArchived: order.isArchived, totalTTC : UtilServices.formatToTwoDecimal(price.discountPrice * 1.20 / 100 * order.advanceRate), totalHT: UtilServices.formatToTwoDecimal(price.discountPrice / 100 * order.advanceRate ), externalCosts: UtilServices.formatToTwoDecimal(externalCosts / 100 * order.advanceRate ), marge: UtilServices.formatToTwoDecimal(marge / 100 * order.advanceRate ), credit:order.credit});
      }
      if (order.advanceRate !== 100) {
        let dateInvoice;
        order.balanceInvoiceDate instanceof Timestamp ? dateInvoice = order.balanceInvoiceDate.toDate().toLocaleDateString() : dateInvoice ='';
        // this.ordersData.push({route : order.route, numeroInvoice : order.numerosInvoice.balance, dateInvoice, id : order.id, client : order.client.name, orderDate : order.orderDate , type: 'solde ' + (100-order.advanceRate) + ' %', invoiceInfos: invoiceInfos.balance, isArchived: order.isArchived, totalTTC : UtilServices.formatToTwoDecimal((price.discountPrice * 1.20 / 100*(100-order.advanceRate)) - order.credit), totalHT: UtilServices.formatToTwoDecimal((price.discountPrice / 100 * ( 100 - order.advanceRate )) - order.credit), marge: UtilServices.formatToTwoDecimal(marge / 100 * ( 100 - order.advanceRate )), credit:order.credit});
        this.ordersData.push({route : order.route, numeroInvoice : order.numerosInvoice.balance, dateInvoice, id : order.id, client : order.client.name, orderDate : order.orderDate , type: 'solde ' + (100-order.advanceRate) + ' %', invoiceInfos: invoiceInfos.balance, isArchived: order.isArchived, totalTTC : UtilServices.formatToTwoDecimal(price.discountPrice * 1.20 / 100*(100-order.advanceRate)), totalHT: UtilServices.formatToTwoDecimal(price.discountPrice / 100 * ( 100 - order.advanceRate )), externalCosts: UtilServices.formatToTwoDecimal(externalCosts / 100 * ( 100 - order.advanceRate )), marge: UtilServices.formatToTwoDecimal(marge / 100 * ( 100 - order.advanceRate )), credit:order.credit});
      }
    });
    this.dataSource = new MatTableDataSource<any>(this.ordersData);
    this.dataSource.paginator = this.paginator; // pagination du tableau
    //this.sort.sort(<MatSortable>({id: 'orderDate', start: 'desc'})); // pour trier sur la date les plus récentes
    this.dataSource.sort = this.sort; // tri sur le tableau
  }

  populateInvoiceDataSource(orders, dateFrom, dateTo) {
    //console.log('Current orders: ', orders);
    this.ordersData = [];
    this.stats = {totalTTC : 0, totalHT:0, externalCosts:0, totalMarge:0, totalDu:0, credit:0};
    orders.forEach((order)=>{
      let invoiceInfos;
      order.paymentInvoice !== undefined ? invoiceInfos = {advance: {numero: order.numerosInvoice.advance, date: order.paymentInvoice.advance.date}, balance: { numero: order.numerosInvoice.balance, date: order.paymentInvoice.balance.date}} : invoiceInfos = {advance: {numero: order.numerosInvoice.advance, date: null}, balance: { numero: order.numerosInvoice.balance, date: null}};
      let price = this.computePriceService.computePrices(order);
      let marge;
      let externalCosts: number = 0;
      if (order.externalCosts === undefined) {
        marge = price.discountPrice;
      } else {
        marge = ComputePriceService.calcMarge(order.externalCosts, price.discountPrice);
        externalCosts = ComputePriceService.getExternalCost(order.externalCosts);
      }
      // if the rate is not equal to zero, then we have a advance invoice and we can push it in the array
      if (order.advanceRate !== 0 && order.advanceRate !== null && order.advanceInvoiceDate instanceof Timestamp && typeof (order.numerosInvoice.advance) === "number") {
        if (order.advanceInvoiceDate.toDate() >= dateFrom && order.advanceInvoiceDate.toDate() <= dateTo) {
          this.ordersData.push({route : order.route, numeroInvoice : order.numerosInvoice.advance, dateInvoice : order.advanceInvoiceDate.toDate().toLocaleDateString(), id : order.id, client : order.client.name, orderDate : order.orderDate, type : 'acompte ' + order.advanceRate + ' %', invoiceInfos: invoiceInfos.advance, isArchived: order.isArchived, totalTTC : UtilServices.formatToTwoDecimal(price.discountPrice * 1.20 / 100 * order.advanceRate), totalHT: UtilServices.formatToTwoDecimal(price.discountPrice / 100 * order.advanceRate ), externalCosts: UtilServices.formatToTwoDecimal(externalCosts / 100 * order.advanceRate ), marge: UtilServices.formatToTwoDecimal(marge / 100 * order.advanceRate), credit:order.credit});
          this.stats.externalCosts += externalCosts / 100 * order.advanceRate;
          this.stats.totalMarge = this.stats.totalMarge + (marge / 100 * order.advanceRate);
          this.stats.totalTTC += price.discountPrice * 1.20 / 100 * order.advanceRate;
          this.stats.totalHT += price.discountPrice / 100 * order.advanceRate;
          if (invoiceInfos.advance.date === null) {this.stats.totalDu += price.discountPrice * 1.20 / 100 * order.advanceRate}
        }
      }
      // if the rate is not equal to hundred, then we have a balance invoice and we can push it in the array
        if (order.advanceRate !== 100 && order.balanceInvoiceDate instanceof Timestamp) {
          if (order.balanceInvoiceDate.toDate()>= dateFrom && order.balanceInvoiceDate.toDate()<=dateTo) {
            //console.log(order.balanceInvoiceDate.toDate() + '  / ' + dateFrom + ' / ' + order.balanceInvoiceDate.toDate() + ' ' + dateTo);
            let dateInvoice;
            order.balanceInvoiceDate instanceof Timestamp ? dateInvoice = order.balanceInvoiceDate.toDate().toLocaleDateString() : dateInvoice ='';
            // this.ordersData.push({route : order.route, numeroInvoice : order.numerosInvoice.balance, dateInvoice, id : order.id, client : order.client.name, orderDate : order.orderDate , type: 'solde ' + (100-order.advanceRate) + ' %', invoiceInfos: invoiceInfos.balance, isArchived: order.isArchived, totalTTC : UtilServices.formatToTwoDecimal((price.discountPrice * 1.20 / 100*(100-order.advanceRate)) - order.credit), totalHT: UtilServices.formatToTwoDecimal((price.discountPrice / 100 * ( 100 - order.advanceRate )) - (order.credit/1.2)), marge: UtilServices.formatToTwoDecimal(marge / 100 * ( 100 - order.advanceRate )), credit:order.credit});
            this.ordersData.push({route : order.route, numeroInvoice : order.numerosInvoice.balance, dateInvoice, id : order.id, client : order.client.name, orderDate : order.orderDate , type: 'solde ' + (100-order.advanceRate) + ' %', invoiceInfos: invoiceInfos.balance, isArchived: order.isArchived, totalTTC : UtilServices.formatToTwoDecimal(price.discountPrice * 1.20 / 100*(100-order.advanceRate)), totalHT: UtilServices.formatToTwoDecimal(price.discountPrice / 100 * ( 100 - order.advanceRate )), externalCosts: UtilServices.formatToTwoDecimal(externalCosts / 100 * ( 100 - order.advanceRate )), marge: UtilServices.formatToTwoDecimal(marge / 100 * ( 100 - order.advanceRate )), credit:order.credit});
            this.stats.externalCosts += externalCosts / 100 * (100 - order.advanceRate);
            this.stats.totalMarge = this.stats.totalMarge + (marge / 100 * ( 100 - order.advanceRate ));
            //this.stats.totalTTC += ((price.discountPrice * 1.20 / 100*(100-order.advanceRate)) - order.credit);
            //this.stats.totalHT += ((price.discountPrice / 100 * ( 100 - order.advanceRate )) - (order.credit/1.2));
            this.stats.totalTTC += price.discountPrice * 1.20 / 100*(100-order.advanceRate);
            this.stats.totalHT += price.discountPrice / 100 * ( 100 - order.advanceRate );
            this.stats.credit += order.credit;
            if (invoiceInfos.balance.date === null) {this.stats.totalDu += ((price.discountPrice * 1.20 / 100*(100-order.advanceRate)) - order.credit)}
          }
         }
    });

    this.stats.totalTTC = Number(UtilServices.formatToTwoDecimal(this.stats.totalTTC));
    this.stats.totalHT = Number(UtilServices.formatToTwoDecimal(this.stats.totalHT));
    this.stats.externalCosts = Number(UtilServices.formatToTwoDecimal(this.stats.externalCosts));
    this.stats.totalMarge = Number(UtilServices.formatToTwoDecimal(this.stats.totalMarge));
    this.stats.totalDu = Number(UtilServices.formatToTwoDecimal(this.stats.totalDu));
    this.stats.credit = Number(UtilServices.formatToTwoDecimal(this.stats.credit));

    this.dataSource = new MatTableDataSource<any>(this.ordersData);
    this.dataSource.paginator = this.paginator; // pagination du tableau
    //this.sort.sort(<MatSortable>({id: 'orderDate', start: 'desc'})); // pour trier sur la date les plus récentes
    this.dataSource.sort = this.sort; // tri sur le tableau
  }

  populateExportInvoice(invoices, dateFrom, dateTo) {
    //console.log('Current invoices: ', invoices);
    let exportInvoices = [];
    invoices.forEach((invoice)=>{
      // if the rate is not equal to zero, then we have a advance invoice and we can push it in the array
      if (invoice.advanceRate !== 0 && invoice.advanceInvoiceDate instanceof Timestamp && typeof (invoice.numerosInvoice.advance) === "number") {
        if (invoice.advanceInvoiceDate.toDate() >= dateFrom && invoice.advanceInvoiceDate.toDate() <= dateTo) {
          if (invoice.advanceRate === 100) {
            exportInvoices.push({invoice : invoice, numeroInvoice : invoice.numerosInvoice.advance, type: 'advance'});
          } else {
            exportInvoices.push({invoice : invoice, numeroInvoice : invoice.numerosInvoice.advance, type: 'advance'});
          }
        }
      }
      // if the rate is not equal to hundred, then we have a balance invoice and we can push it in the array
      if (invoice.advanceRate !== 100 && invoice.balanceInvoiceDate instanceof Timestamp) {
        if (invoice.balanceInvoiceDate.toDate()>= dateFrom && invoice.balanceInvoiceDate.toDate()<=dateTo) {
          //console.log(invoice.balanceInvoiceDate.toDate() + '  / ' + dateFrom + ' / ' + invoice.balanceInvoiceDate.toDate() + ' ' + dateTo);
          exportInvoices.push({invoice : invoice, numeroInvoice : invoice.numerosInvoice.balance, type: 'balance'});
        }
      }
    });
    this.exportCsvService.wantExportOrderCsv(exportInvoices);
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
    //this.selectOrderByDate(this.formDates.value.dateFrom, this.formDates.value.dateTo);
    this.selectInvoiceByDate(this.formDates.value.dateFrom, this.formDates.value.dateTo, false);
  }

  wantExportOrderCsv() {
    //console.log("wantExportOrderCsv");
    if (this.formDates.value.dateFrom === undefined || this.formDates.value.dateFrom === '' || this.formDates.value.dateFrom === null
      || this.formDates.value.dateTo === undefined || this.formDates.value.dateTo === '' || this.formDates.value.dateTo === null) {
      this.openDialogMessage("Vous devez spécifier des dates d'export !");
    } else {
      this.selectInvoiceByDate(this.formDates.value.dateFrom, this.formDates.value.dateTo, true);
    }
  }

  openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogListInvoiceOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });
    dialogRef.afterClosed().subscribe();
  }

  selectInvoiceByDate(dateFrom, dateTo, shouldExport) {
    if (dateFrom === undefined || dateFrom === '' || dateFrom === null || dateTo === undefined || dateTo === '' || dateTo === null) {
    }
    else {
      //dateTo.setDate(dateTo.getDate() + 1);   // on rajoute 24h car la date de fin est les jour à 0h00 et non à 23h59h59
      //console.log("dateFrom : ", dateFrom, ' / dateTo : ', dateTo);

      // first we fetch by advanceInvoiceDate
      const fbOrders = this.db.collection('orders', ref => ref
        .orderBy('advanceInvoiceDate')
        .startAt(dateFrom)
        .endAt(dateTo))
        .snapshotChanges()
        .pipe(map(actions => actions.map(a => {
          const data = a.payload.doc.data();
          return { route : 'detail-order/', id : a.payload.doc.id, isArchived : false, ...data };
        }))).subscribe(orders => {
          fbOrders.unsubscribe();
          //console.log("orders by advanceInvoiceDate", orders);
          const fbArchivedOrders = this.db.collection('archived-orders', ref => ref
            .orderBy('advanceInvoiceDate')
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
                .orderBy('advanceInvoiceDate')
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
                    .orderBy('advanceInvoiceDate')
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

                      // second we fetch by balanceInvoiceDate
                      const fbOrders = this.db.collection('orders', ref => ref
                        .orderBy('balanceInvoiceDate')
                        .startAt(dateFrom)
                        .endAt(dateTo))
                        .snapshotChanges()
                        .pipe(map(actions => actions.map(a => {
                          const data = a.payload.doc.data();
                          return { route : 'detail-order/', id : a.payload.doc.id, isArchived : false, ...data };
                        }))).subscribe(orders => {
                          fbOrders.unsubscribe();
                          const ordersC = allOrdersAndServiceContracts.concat(orders);
                          //console.log("orders by balanceInvoiceDate", orders);
                          const fbArchivedOrders = this.db.collection('archived-orders', ref => ref
                            .orderBy('balanceInvoiceDate')
                            .startAt(dateFrom)
                            .endAt(dateTo))
                            .snapshotChanges()
                            .pipe(map(actions => actions.map(a => {
                              const data = a.payload.doc.data();
                              return { route : 'detail-order/', id : a.payload.doc.id, isArchived : true, ...data };
                            }))).subscribe(archivedOrders => {
                              fbArchivedOrders.unsubscribe();
                              const allOrders = ordersC.concat(archivedOrders);
                              const fbServiceContracts = this.db.collection('service-contracts', ref => ref
                                .orderBy('balanceInvoiceDate')
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
                                    .orderBy('balanceInvoiceDate')
                                    .startAt(dateFrom)
                                    .endAt(dateTo))
                                    .snapshotChanges()
                                    .pipe(map(actions => actions.map(a => {
                                      const data = a.payload.doc.data();
                                      return { route : 'detail-service-contract/', id : a.payload.doc.id, isArchived : true, ...data };
                                    }))).subscribe(archivedServiceContracts => {
                                      fbArchivedServiceContracts.unsubscribe();
                                      const allServicesContract = serviceContracts.concat(archivedServiceContracts);
                                      let allOrdersAndServiceContracts = allOrders.concat(allServicesContract);
                                      // remove duplicate entries
                                      allOrdersAndServiceContracts = allOrdersAndServiceContracts.filter((object, index) => index === allOrdersAndServiceContracts.findIndex(obj => JSON.stringify(obj) === JSON.stringify(object)));
                                      if (shouldExport) {
                                        //this.exportCsvService.wantExportOrderCsv(allOrdersAndServiceContracts);
                                        this.populateExportInvoice(allOrdersAndServiceContracts, dateFrom, dateTo);
                                      } else {
                                        this.populateInvoiceDataSource(allOrdersAndServiceContracts, dateFrom, dateTo);
                                      }
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }
  }
}

@Component({
  selector: 'dialog-list-invoice-overview',
  templateUrl: 'dialog-list-invoice-overview.html',
})
export class DialogListInvoiceOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogListInvoiceOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogListInvoiceData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
