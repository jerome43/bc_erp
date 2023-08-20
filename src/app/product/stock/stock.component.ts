import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { Validators, FormBuilder } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import { StockService } from './stock.service';
import { StockProducts } from './StockProducts';
import {AngularFirestore, AngularFirestoreDocument} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import {Subscription} from "rxjs";
import {MatSort, MatPaginator, MatTableDataSource} from '@angular/material';
import {ActivatedRoute, Route, Router} from "@angular/router";
import {tap} from "rxjs/operators";
import {Product} from "../product";
import {ProductItem} from "../ProductItem";
import {ProductStatus} from "../ProductStatus";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;

export interface DialogStockData {
  message: string;
  displayNoButton:boolean;
  detailStock: any,
  dateFrom: Date;
  dateTo: Date;
  displayedDateFrom: Date;
  displayedDateTo: Date;
}

export interface DialogDayRealStockOverviewData {
  message: string;
  displayNoButton:boolean;
  productItems: ProductItem[];
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
  displayedColumns: string[] = ['name', 'dates', 'stats', 'dayRealStock', 'view', 'id']; // colones affichées par le tableau
  private stockProductsData : Array<any>; // tableau qui va récupérer les données adéquates de fbStockProducts pour être ensuite affectées au tableau de sources de données
  dataSource : MatTableDataSource<StockId>; // source de données du tableau
  public stockTypeParams={path : "stockProducts", isLongRental:false, templateTitle:"Stocks Location produits courte durée ", templateButton:" voir stock longue durée"}; // les paramètres liés au type de stock (produits en location courte durée ou longue durée)


  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private route: ActivatedRoute, private fb: FormBuilder, public dialog: MatDialog, private stockService: StockService, private db: AngularFirestore) {
  }

  ngOnInit() {
    // subscribe to the parameters observable
    this.route.paramMap.subscribe(params => {
      //console.log(params.get('isLongRental'));
      this.route.snapshot.paramMap.get('isLongRental')==="true" ? this.stockTypeParams.isLongRental = true : this.stockTypeParams.isLongRental = false;
      this.setStockTypeParams(this.stockTypeParams.isLongRental);
      this.initForm();
      this.initStocks();
    });
  }


  ngOnDestroy() {
    this.fbStockProductsSubscription.unsubscribe();
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
  }

  viewDetailStock(eventTargetId) {
    //console.log("viewDetailStock ");
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

  viewDayRealStock(id: string) {
    const productDoc: AngularFirestoreDocument<Product> = this.db.doc<Product>('products/' + id );
    productDoc.ref.get().then((product)=>{
      if (product.data()) {
        this.dialog.open(DialogDayRealStockOverview, {
          width: '800px',
          data: {
            message: "Etat des stocks au " + new Date().toLocaleDateString() + " du produit " + product.data().name,
            displayNoButton:false,
            productItems: product.data().productItems ? product.data().productItems : []
          }
        });
      } else {
        this.dialog.open(DialogDayRealStockOverview, {
          width: '800px',
          data: {
            message: "Désolé, ce produit n'existe plus",
            displayNoButton:false,
            productItems: []
          }
        });
      }
    })
  }

  initForm() {
    this.stockDatesForm = this.fb.group({
      dateFrom: [new Date(), Validators.required],
      dateTo: [new Date(), Validators.required],
    });
    this.stockDatesForm.valueChanges.subscribe(data => {
      //.log('stockDatesForm changes', data);
      this.selectStockByDate();
    });
  }

  initStocks() {
    if (this.fbStockProductsSubscription instanceof  Subscription) {this.fbStockProductsSubscription.unsubscribe()}
    this.fbStockProducts = this.db.collection(this.stockTypeParams.path).valueChanges();
    // Call subscribe() to start listening for updates.
    this.fbStockProductsSubscription = this.fbStockProducts.subscribe((stockProducts)=>{
      //console.log("fbStockProductsSubscription ", this.stockTypeParams.path, ' - ', stockProducts);
      this.stockProductsData = [];
      stockProducts.forEach(stockProduct=> {
        const immoDates = stockProduct.immoDates;
        stockProduct.immoDates.sort(function(a,b) { // tri des dates par ordre ascendant  sur la date de début d'immobilisation
          return a.immoDateFrom.seconds<b.immoDateFrom.seconds ? -1 : a.immoDateFrom.seconds>b.immoDateFrom.seconds ? 1 : 0;
        });
        const immosFromDateToDate = this.immosFromDateToDate(stockProduct);
        const immosFromDateToDateDate = immosFromDateToDate.date;
        const id = stockProduct.productId;
        const name = stockProduct.productName;
        const productStock = stockProduct.productStock;
        const stats = immosFromDateToDate.quantity + ' / ' + stockProduct.productStock;
        this.stockProductsData.push({id, name, productStock, immosFromDateToDateDate, immoDates, stats})}
      );
      this.dataSource = new MatTableDataSource<StockId>(this.stockProductsData);
      this.dataSource.paginator = this.paginator; // pagination du tableau
      this.dataSource.sort = this.sort; // tri sur le tableau
    });
  }

  immosFromDateToDate(stockProduct): {date: string, quantity: number} { // récupère juste la prochaine immobilisation la plus proche de la date de début rentrée dans la formulaire
    let immosFromDateToDate= {date: "aucunes futures immobilisations trouvées", quantity: 0};
    for (let i=0; i< stockProduct.immoDates.length; i++) {
      if ( stockProduct.immoDates[i].immoDateFrom.seconds>=this.stockDatesForm.value.dateFrom.getTime() / 1000
      || stockProduct.immoDates[i].immoDateTo.seconds>=this.stockDatesForm.value.dateFrom.getTime() / 1000) {
        // todo corriger bug en prod immoDates[i].immoDateFrom.toDate() is not a function
        //immosFromDateToDate.date = 'du ' +  stockProduct.immoDates[i].immoDateFrom.toDate().toLocaleDateString() + ' au ' +  stockProduct.immoDates[i].immoDateTo.toDate().toLocaleDateString();
        immosFromDateToDate.date = 'du ' +  (stockProduct.immoDates[i].immoDateFrom  instanceof Timestamp ? stockProduct.immoDates[i].immoDateFrom.toDate().toLocaleDateString() : stockProduct.immoDates[i].immoDateFrom) + ' au ' +  (stockProduct.immoDates[i].immoDateTo instanceof Timestamp ? stockProduct.immoDates[i].immoDateTo.toDate().toLocaleDateString() : stockProduct.immoDates[i].immoDateTo);
        immosFromDateToDate.quantity = stockProduct.immoDates[i].quantity;
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

    dialogRef.afterClosed().subscribe(() => {
      //console.log('The dialog was closed');
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

    dialogRef.afterClosed().subscribe(() => {
      //console.log('The dialog was closed');
    });
  }

  private setStockTypeParams(isLongRental: boolean) {
    //console.log("isLongRental :" + isLongRental);
    if (isLongRental) {
      this.stockTypeParams.path='stockProducts-longRental';
      this.stockTypeParams.isLongRental = true;
      this.stockTypeParams.templateTitle= "Liste des produits immobilisés - longue durée";
      this.stockTypeParams.templateButton = " Voir stock courte durée";
    }
    else {
      this.stockTypeParams.path = 'stockProducts';
      this.stockTypeParams.isLongRental = false;
      this.stockTypeParams.templateTitle = "Liste des produits immobilisés - courte durée";
      this.stockTypeParams.templateButton = " Voir stock longue durée";
    }
  }
}

@Component({
  selector: 'dialog-stock-overview',
  templateUrl: 'dialog-stock-overview.html',
})
export class DialogStockOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogStockOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogStockData,
    private db: AngularFirestore,
    private router:Router) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  clickDiplayOrderDetail(orderId) {
    const detailOrderSsubsription = this.db.doc<any>("orders/"+orderId).valueChanges().pipe(
      tap(order => {
        let archived;
        order != undefined ? archived = false : archived = true;
        detailOrderSsubsription.unsubscribe();
        this.router.navigate(['detail-order/'+orderId, {archived: archived}]).then();
      })).subscribe(()=>{});
  }
}

@Component({
  selector: 'dialog-day-real-stock-overview',
  templateUrl: 'dialog-day-real-stock-overview.html',
})
export class DialogDayRealStockOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogDayRealStockOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogDayRealStockOverviewData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  getProductStatusMsg(productStatus) {
    switch (productStatus) {
      case ProductStatus.Unavailable: return "indisponible";
      case ProductStatus.Available: return "disponible";
      case ProductStatus.Maintenance: return "en maintenance";
      case ProductStatus.Sold: return "Vendu";
      default: return "statut inconnu";
    }
  }
}
