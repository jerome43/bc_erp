import {AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AngularFirestore, AngularFirestoreDocument} from '@angular/fire/firestore';
import {AngularFireStorage} from '@angular/fire/storage';
import {Observable, Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef, MatPaginator, MatSort, MatTableDataSource} from '@angular/material';
import {Product} from '../product';
import {Router} from '@angular/router';
import {ProductType} from "../ProductType";
import {MatInput} from "@angular/material/input";

export interface DialogListProductData { message: string; displayNoButton:boolean }
export interface ProductId extends Product { id: string; }

@Component({
  selector: 'app-list-product',
  templateUrl: './list-product.component.html',
  styleUrls: ['./list-product.component.less']
})

export class ListProductComponent implements OnInit, AfterViewInit, OnDestroy {
  private fbProducts: Observable<ProductId[]>; // produtcs on Firebase
  private fbProductsSubscription : Subscription;
  public displayedColumns: string[] = ['type', 'name', 'internal_number', 'date', 'edit', 'delete', 'id']; // colones affichées par le tableau
  private productsData : Array<any>; // tableau qui va récupérer les données adéquates de fbProducts pour être ensuite affectées au tableau de sources de données
  public dataSource : MatTableDataSource<ProductId>; // source de données du tableau

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau
  @ViewChild("inputSearch") inputSearch: ElementRef;

  constructor(private router: Router, private db: AngularFirestore, private dialog: MatDialog, private storage: AngularFireStorage) {}

  ngOnInit() {
    this.initListProducts();
  }

  ngAfterViewInit() {
    setTimeout(()=> {
      this.inputSearch.nativeElement.focus();
    }, 300)
  }

  ngOnDestroy() {
    this.fbProductsSubscription.unsubscribe();
  }

  private initListProducts() {
    this.fbProducts = this.db.collection('products').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Product;
        const id = a.payload.doc.id;
        return {id, ...data };
      })));
    if (this.fbProductsSubscription instanceof  Subscription) {this.fbProductsSubscription.unsubscribe()}
    this.fbProductsSubscription = this.fbProducts.subscribe((products)=>{
      //console.log('Current products: ', products);
      this.productsData = [];
      products.forEach((product)=>{
        let type;
        switch (product.type) {
          case ProductType.service :
            type = 'Prestation de service';
            break;
          case ProductType.longRental :
            type = 'Location longue durée';
            break;
          case ProductType.rental :
            type = 'Location courte durée';
            break;
          case ProductType.sale :
            type = 'Vente';
            break;
          case ProductType.serviceContract :
            type = 'Contrat de maintenance';
            break;
        }
        this.productsData.push({id : product.id, type : type, name : product.name, internal_number: product.internal_number, date : product.date});
      });
      this.dataSource = new MatTableDataSource<ProductId>(this.productsData);
      this.dataSource.paginator = this.paginator; // pagination du tableau
      this.dataSource.sort = this.sort; // tri sur le tableau
    });
  }

  public applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
    if (this.dataSource.filteredData.length === 1) {
      this.editProduct(this.dataSource.filteredData[0].id);
    }
  }

  public editProduct(eventTargetId) {
    //console.log(eventTargetId);
    this.router.navigate(['detail-product/'+eventTargetId]).then();
  }

  public wantDeleteProduct(eventTargetId) {
    //console.log("wantDeleteProduct"+eventTargetId);
    this.openDialogWantDelete(eventTargetId, "Voulez-vous vraiment supprimer le produit "+eventTargetId+" ?")
  }

  private openDialogWantDelete(id, message): void {
    const dialogRef = this.dialog.open(DialogListProductOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true}
    });

    dialogRef.afterClosed().subscribe(result => {
      //console.log('The dialog was closed'+result);
      if (result=='yes') {
        this.deleteProduct(id);
      }
    });
  }

  private deleteProduct(eventTargetId) { // pour supprimer le produit dans firebase
    //console.warn("deleteProduct : "+eventTargetId);
    const productDoc: AngularFirestoreDocument<Product> = this.db.doc<Product>('products/' + eventTargetId );
    // supression de la photo associée au produit dans firestorage
    productDoc.ref.get().then((product)=>{
      if (product.exists) {
        // si la photo == null, undefined, "" ou 0, renvoie false, sinon true
        //console.log("product.photo :"+product.data().photo);
        if (product.data().photo) {this.storage.ref(product.data().photo).delete();} // suppression de la photo associée au produit si elle existe
        this.productsData = []; // on vide au préalable le tableau sinon les documents vont se surajouter aux anciens
        // supression du produit dans firestore
        productDoc.delete().then(() => {
          this.openDialogDelete("Le produit "+eventTargetId+" a été supprimé.")});
      }
      else {
        //console.log("product doesn't exists");
      }
    });
  }

  private openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogListProductOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false}
    });

    dialogRef.afterClosed().subscribe();
  }
}

@Component({
  selector: 'dialog-list-product-overview',
  templateUrl: 'dialog-list-product-overview.html',
})
export class DialogListProductOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogListProductOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogListProductData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
