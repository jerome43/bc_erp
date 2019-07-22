import { Component, OnInit, OnDestroy, Inject, ViewChild } from '@angular/core';
import { Validators, FormControl, FormBuilder } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import { StockService } from './stock.service';
import { StockProducts } from './StockProducts';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {Subscription} from "rxjs/index";
import {MatSort, MatPaginator, MatTableDataSource, MatSortable} from '@angular/material';

export interface DialogStockData {
  message: string;
  displayNoButton:boolean;
  detailStock: any,
  dateFrom: Date;
  dateTo: Date;
  displayedDateFrom: Date;
  displayedDateTo: Date;
}

export interface StockId extends StockProducts { id: string; }

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.less']
})

export class StockComponent implements OnInit {
  stockDatesForm;
  private fbStockProducts: Observable<any>; // stocks on Firebase
  private fbStockProductsSubscription : Subscription;
  displayedColumns: string[] = ['name', 'dates', 'view', 'id']; // colones affichées par le tableau
  private stockProductsData : Array<any>; // tableau qui va récupérer les données adéquates de fbStockProducts pour être ensuite affectées au tableau de sources de données
  dataSource : MatTableDataSource<StockId>; // source de données du tableau

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private fb: FormBuilder, public dialog: MatDialog, private stockService: StockService, private db: AngularFirestore) {
  }

  ngOnInit() {
    this.initForm();
    this.initStocks();
  }

  ngOnDestroy() {
    this.fbStockProductsSubscription.unsubscribe();
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
  }

  viewDetailStock(eventTargetId) {
    console.log("viewDetailStock ");
    if (this.stockDatesForm.value.dateFrom === undefined || this.stockDatesForm.value.dateFrom === '' || this.stockDatesForm.value.dateFrom === null || this.stockDatesForm.value.dateTo === undefined || this.stockDatesForm.value.dateTo === '' || this.stockDatesForm.value.dateTo === null) {
      this.openDialogMessage("Vous devez spécifier des dates");
    }
    else {
      //console.log("this.stockProductsData ", this.stockProductsData);
      const detailStockProduct =  this.stockProductsData.find(function(element) {
        return element.id == eventTargetId
      });
      this.openDialogViewDetail(detailStockProduct);
    }
  }

  initForm() {
    this.stockDatesForm = this.fb.group({
      dateFrom: [new Date(), Validators.required],
      dateTo: [new Date(), Validators.required],
    });
    this.stockDatesForm.valueChanges.subscribe(data => {
      console.log('stockDatesForm changes', data);
      this.selectStockByDate();
    });
  }

  initStocks() {
    if (this.fbStockProductsSubscription instanceof  Subscription) {this.fbStockProductsSubscription.unsubscribe()}
    this.fbStockProducts = this.db.collection('stockProducts').valueChanges();
    // Call subscribe() to start listening for updates.
    this.fbStockProductsSubscription = this.fbStockProducts.subscribe((stockProducts)=>{
      console.log("fbStockProductsSubscription stockProducts: ", stockProducts);
      this.stockProductsData = [];
      stockProducts.forEach(stockProduct=> {
        const immoDates = stockProduct.immoDates;
        stockProduct.immoDates.sort(function(a,b) { // tri des dates par ordre ascendant  sur la date de début d'immobilisation
          return a.immoDateFrom.seconds<b.immoDateFrom.seconds ? -1 : a.immoDateFrom.seconds>b.immoDateFrom.seconds ? 1 : 0;
        });
        const immosFromDateToDate = this.immosFromDateToDate(stockProduct);
        const id = stockProduct.productId;
        const name = stockProduct.productName;
        const productStock = stockProduct.productStock;
        this.stockProductsData.push({id, name, productStock, immosFromDateToDate, immoDates})}
      );
      this.dataSource = new MatTableDataSource<StockId>(this.stockProductsData);
      this.dataSource.paginator = this.paginator; // pagination du tableau
      this.dataSource.sort = this.sort; // tri sur le tableau
    });
  }

  immosFromDateToDate(stockProduct): string { // récupère juste la prochaine immobilisation la plus proche de la date de début rentrée dans la formulaire
    var immosFromDateToDate="aucunes futures immobilisations trouvées";
    for (var i=0; i< stockProduct.immoDates.length; i++) {
      if ( stockProduct.immoDates[i].immoDateFrom.seconds>=this.stockDatesForm.value.dateFrom.getTime()/1000
      || stockProduct.immoDates[i].immoDateTo.seconds>=this.stockDatesForm.value.dateFrom.getTime()/1000) {
        immosFromDateToDate = 'du ' +  stockProduct.immoDates[i].immoDateFrom.toDate().toLocaleDateString() + ' au ' +  stockProduct.immoDates[i].immoDateTo.toDate().toLocaleDateString();
        break;
      }
    }
    return immosFromDateToDate;
  }

  selectStockByDate() {
    if (this.stockDatesForm.value.dateFrom === undefined || this.stockDatesForm.value.dateFrom === '' || this.stockDatesForm.value.dateFrom === null || this.stockDatesForm.value.dateTo === undefined || this.stockDatesForm.value.dateTo === '' || this.stockDatesForm.value.dateTo === null) {
      this.openDialogMessage("Vous devez spécifier des dates");
    }
    else {
      this.initStocks();
    }
  }

  openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogStockOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false,
        detailStock: null,
        dateFrom : null,
        dateTo: null,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }

  openDialogViewDetail(detailStock): void {
    const dialogRef = this.dialog.open(DialogStockOverview, {
      width: '80%',
      data: {
        message: null,
        displayNoButton:false,
        detailStock: detailStock,
        dateFrom : this.stockDatesForm.value.dateFrom.getTime()/1000,
        dateTo : this.stockDatesForm.value.dateTo.getTime()/1000,
        displayedDateFrom : this.stockDatesForm.value.dateFrom.toLocaleDateString(),
        displayedDateTo : this.stockDatesForm.value.dateTo.toLocaleDateString(),
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }

}

@Component({
  selector: 'dialog-stock-overview',
  templateUrl: 'dialog-stock-overview.html',
})
export class DialogStockOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogStockOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogStockData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
