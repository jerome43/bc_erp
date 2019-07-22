import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import {ExportCsvService} from "../../export/export-csv.service";
import { map } from 'rxjs/operators';
import { FormControl, FormBuilder } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';

export interface DialogExportOrderData {
  message: string;
  displayNoButton:boolean;
}

@Component({
  selector: 'app-export-order',
  templateUrl: './export-order.component.html',
  styleUrls: ['./export-order.component.less']
})
export class ExportOrderComponent implements OnInit {
  exportForm;
  private exportOrdersData = []; // tableau qui va récupérer les données à exporter

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
    console.log("wantExportOrderCsv");
    this.selectOrderByDate(this.exportForm.value.dateFrom, this.exportForm.value.dateTo);
  }

  selectOrderByDate(dateFrom, dateTo) {
    if (dateFrom===undefined || dateFrom==='' || dateFrom===null || dateTo===undefined || dateTo==='' || dateTo===null) {
      this.openDialogMessage("Vous devez spécifier des dates d'export !");
    }
    else {
      dateTo.setDate(dateTo.getDate() + 1);   // on rajoute 24h car la date de fin est les jour à 0h00 et non à 23h59h59
      console.log("dateFrom : ", dateFrom, ' / dateTo : ', dateTo);

      var orderDateToExport = this.db.collection('orders', ref => ref.orderBy('orderDate').startAt(dateFrom)
        .endAt(dateTo)).snapshotChanges().pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data();
            const id = a.payload.doc.id;
            return { id, ...data };
          }))).subscribe(advanceData => {
            orderDateToExport.unsubscribe();
            console.log("advanceData", advanceData);
            var archivedOrderDateToExport = this.db.collection('archived-orders', ref => ref.orderBy('orderDate').startAt(dateFrom)
              .endAt(dateTo)).snapshotChanges().pipe(
                map(actions => actions.map(a => {
                  const data = a.payload.doc.data();
                  const id = a.payload.doc.id;
                  return { id, ...data };
                }))).subscribe(archivedAdvanceData => {
                  console.log("archivedAdvanceData", archivedAdvanceData);
                  var advanceInvoiceData = advanceData.concat(archivedAdvanceData);
                  console.log("advanceInvoiceData", advanceInvoiceData);
                  archivedOrderDateToExport.unsubscribe();
                  var balanceInvoiceDateToExport = this.db.collection('orders', ref => ref.orderBy('balanceInvoiceDate').startAt(dateFrom)
                    .endAt(dateTo)).snapshotChanges().pipe(
                    map(actions => actions.map(a => {
                      const data = a.payload.doc.data();
                      const id = a.payload.doc.id;
                      return { id, ...data };
                    }))).subscribe(balanceData => {
                    balanceInvoiceDateToExport.unsubscribe();
                    console.log("balanceData", balanceData);
                    var archivedBalanceInvoiceDateToExport = this.db.collection('archived-orders', ref => ref.orderBy('balanceInvoiceDate').startAt(dateFrom)
                      .endAt(dateTo)).snapshotChanges().pipe(
                      map(actions => actions.map(a => {
                        const data = a.payload.doc.data();
                        const id = a.payload.doc.id;
                        return { id, ...data };
                      }))).subscribe(archivedBalanceData => {
                      console.log("archivedBalanceData", archivedBalanceData);
                      var balanceInvoiceData = balanceData.concat(archivedBalanceData);
                      console.log("balanceInvoiceData", balanceInvoiceData);
                      this.exportCsvService.wantExportOrderCsv(advanceInvoiceData, balanceInvoiceData);
                      archivedBalanceInvoiceDateToExport.unsubscribe();
                    });
                  });
                });
            });
    }
  }

  openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogExportOrderOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }
}

@Component({
  selector: 'dialog-export-order-overview',
  templateUrl: 'dialog-export-order-overview.html',
})
export class DialogExportOrderOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogExportOrderOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogExportOrderData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}

