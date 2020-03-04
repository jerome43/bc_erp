import { Component, OnInit, Inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import {ExportCsvService} from "../../export/export-csv.service";
import { map } from 'rxjs/operators';
import { FormBuilder } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';

/*
export interface DialogExportOrderData {
  message: string;
  displayNoButton:boolean;
}
 */


@Component({
  selector: 'app-export-order',
  templateUrl: './export-order.component.html',
  styleUrls: ['./export-order.component.less']
})
export class ExportOrderComponent implements OnInit {

  public exportForm;

  constructor(private db: AngularFirestore, private fb: FormBuilder, private dialog: MatDialog, private exportCsvService: ExportCsvService) {
  }

  ngOnInit() {
    this.initForm();
  }

  ngOnDestroy() {
    // unsubscribe to avoid memory leaks
  }

  initForm() {
    this.exportForm = this.fb.group({
      dateFrom: [''],
      dateTo: [''],
    });
  }

  wantExportOrderCsv() {
    //console.log("wantExportOrderCsv");
    this.selectOrderByDate(this.exportForm.value.dateFrom, this.exportForm.value.dateTo);
  }

  selectOrderByDate(dateFrom, dateTo) {
    if (dateFrom===undefined || dateFrom==='' || dateFrom===null || dateTo===undefined || dateTo==='' || dateTo===null) {
      //this.openDialogMessage("Vous devez spécifier des dates d'export !");
    } else {
      dateTo.setDate(dateTo.getDate() + 1);   // on rajoute 24h car la date de fin est les jour à 0h00 et non à 23h59h59
      //console.log("dateFrom : ", dateFrom, ' / dateTo : ', dateTo);

      const fbAdvanceOrders = this.db.collection('orders', ref => ref.orderBy('orderDate').startAt(dateFrom)
        .endAt(dateTo)).snapshotChanges().pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data();
            const id = a.payload.doc.id;
            return { id, ...data };
            }))).subscribe(advanceOrders => {
            fbAdvanceOrders.unsubscribe();
            //console.log("advanceOrders", advanceOrders);
            const fbArchivedAdvanceOrders = this.db.collection('archived-orders', ref => ref.orderBy('orderDate').startAt(dateFrom)
              .endAt(dateTo)).snapshotChanges().pipe(
                map(actions => actions.map(a => {
                  const data = a.payload.doc.data();
                  const id = a.payload.doc.id;
                  return { id, ...data };
                }))).subscribe(archivedAdvanceOrders => {
                  fbArchivedAdvanceOrders.unsubscribe();
                  //console.log("archivedAdvanceOrders", archivedAdvanceOrders);
                  const allAdvanceOrders = advanceOrders.concat(archivedAdvanceOrders);
                  const fbBalanceOrders = this.db.collection('orders', ref => ref.orderBy('balanceInvoiceDate').startAt(dateFrom)
                    .endAt(dateTo)).snapshotChanges().pipe(
                      map(actions => actions.map(a => {
                        const data = a.payload.doc.data();
                        const id = a.payload.doc.id;
                        return {id, ...data};
                      }))).subscribe(balanceOrders => {
                        fbBalanceOrders.unsubscribe();
                        //console.log("balanceOrders", balanceOrders);
                        const fbArchivedBalanceOrders = this.db.collection('archived-orders', ref => ref.orderBy('balanceInvoiceDate').startAt(dateFrom)
                          .endAt(dateTo)).snapshotChanges().pipe(
                            map(actions => actions.map(a => {
                              const data = a.payload.doc.data();
                              const id = a.payload.doc.id;
                              return {id, ...data};
                              }))).subscribe(archivedBalanceOrders => {
                                //console.log("archivedBalanceOrders", archivedBalanceOrders);
                                fbArchivedBalanceOrders.unsubscribe();
                                const allBalanceOrders = balanceOrders.concat(archivedBalanceOrders);

                                const fbAdvanceServiceContracts = this.db.collection('service-contracts', ref => ref.orderBy('orderDate').startAt(dateFrom)
                                  .endAt(dateTo)).snapshotChanges().pipe(
                                  map(actions => actions.map(a => {
                                    const data = a.payload.doc.data();
                                    const id = a.payload.doc.id;
                                    return { id, ...data };
                                  }))).subscribe(advanceServiceContracts => {
                                  fbAdvanceServiceContracts.unsubscribe();
                                  //console.log("advanceServiceContracts", advanceServiceContracts);
                                  const fbArchivedAdvanceServiceContracts = this.db.collection('archived-service-contracts', ref => ref.orderBy('orderDate').startAt(dateFrom)
                                    .endAt(dateTo)).snapshotChanges().pipe(
                                    map(actions => actions.map(a => {
                                      const data = a.payload.doc.data();
                                      const id = a.payload.doc.id;
                                      return { id, ...data };
                                    }))).subscribe(archivedAdvanceServiceContracts => {
                                    fbArchivedAdvanceServiceContracts.unsubscribe();
                                    //console.log("archivedAdvanceServiceContracts", archivedAdvanceServiceContracts);
                                    const allAdvanceServiceContracts = advanceServiceContracts.concat(archivedAdvanceServiceContracts);
                                    const fbBalanceServiceContracts = this.db.collection('service-contracts', ref => ref.orderBy('balanceInvoiceDate').startAt(dateFrom)
                                      .endAt(dateTo)).snapshotChanges().pipe(
                                      map(actions => actions.map(a => {
                                        const data = a.payload.doc.data();
                                        const id = a.payload.doc.id;
                                        return {id, ...data};
                                      }))).subscribe(balanceServiceContracts => {
                                      fbBalanceServiceContracts.unsubscribe();
                                      //console.log("balanceServiceContracts", balanceServiceContracts);
                                      const fbArchivedBalanceServiceContracts = this.db.collection('archived-service-contracts', ref => ref.orderBy('balanceInvoiceDate').startAt(dateFrom)
                                        .endAt(dateTo)).snapshotChanges().pipe(
                                        map(actions => actions.map(a => {
                                          const data = a.payload.doc.data();
                                          const id = a.payload.doc.id;
                                          return {id, ...data};
                                        }))).subscribe(archivedBalanceServiceContracts => {
                                        //console.log("archivedBalanceServiceContracts", archivedBalanceServiceContracts);
                                        fbArchivedBalanceServiceContracts.unsubscribe();
                                        const allBalanceServiceContracts = balanceServiceContracts.concat(archivedBalanceServiceContracts);
                                        const allAdvanceOrdersAndServiceContracts = allAdvanceOrders.concat(allAdvanceServiceContracts);
                                        const allBalanceOrdersAndServiceContracts = allBalanceOrders.concat(allBalanceServiceContracts);
                                        this.exportCsvService.wantExportOrderCsvFromPageExport(allAdvanceOrdersAndServiceContracts, allBalanceOrdersAndServiceContracts);
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

  /*
   openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogExportOrderOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });
    dialogRef.afterClosed().subscribe();
  }
   */

}
/*
@Component({
  selector: 'dialog-export-order-overview',
  templateUrl: 'dialog-list-invoice-overview.html',
})
export class DialogExportOrderOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogExportOrderOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogExportOrderData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
 */


