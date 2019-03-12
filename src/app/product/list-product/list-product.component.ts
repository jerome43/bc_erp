import { Component, OnInit, OnDestroy, ViewChild, Inject } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {MatSort, MatPaginator, MatTableDataSource, MatSortable} from '@angular/material';
import { Product } from '../product';
import { Router } from '@angular/router';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs/index";

export interface DialogListProductData { message: string; displayNoButton:boolean }
export interface ProductId extends Product { id: string; }

@Component({
  selector: 'app-list-product',
  templateUrl: './list-product.component.html',
  styleUrls: ['./list-product.component.less']
})

export class ListProductComponent implements OnInit, OnDestroy {
  fbProducts: Observable<ProductId[]>; // produtcs on Firebase
  fbProductsSubscription : Subscription;
  displayedColumns: string[] = ['name', 'date', 'edit', 'delete', 'id']; // colones affichées par le tableau
  productsData : Array<any>; // tableau qui va récupérer les données adéquates de fbProducts pour être ensuite affectées au tableau de sources de données
  dataSource : MatTableDataSource<ProductId>; // source de données du tableau

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private router: Router, private db: AngularFirestore, private dialog: MatDialog, private storage: AngularFireStorage) {}

  ngOnInit() {
    this.initListProducts();
  }

  ngOnDestroy() {
    this.fbProductsSubscription.unsubscribe();
  }

  initListProducts() {
    this.fbProducts = this.db.collection('products').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Product;
        const id = a.payload.doc.id;
        return {id, ...data };
      })));
    if (this.fbProductsSubscription instanceof  Subscription) {this.fbProductsSubscription.unsubscribe()}
    this.fbProductsSubscription = this.fbProducts.subscribe((products)=>{
      console.log('Current products: ', products);
      this.productsData = [];
      products.forEach((product)=>{
        const id = product.id;
        const name = product.name;
        const date = product.date;
        this.productsData.push({id, name, date});
      });
      this.dataSource = new MatTableDataSource<ProductId>(this.productsData);
      this.dataSource.paginator = this.paginator; // pagination du tableau
      //this.sort.sort(<MatSortable>({id: 'name', start: 'desc'})); //  pour trier sur les noms par ordre alphabétique
      this.dataSource.sort = this.sort; // tri sur le tableau
    });
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
  }

  editProduct(eventTargetId) {
    console.log(eventTargetId);
    this.router.navigate(['detail-product/'+eventTargetId]);
  }

  wantDeleteProduct(eventTargetId) {
    console.log("wantDeleteProduct"+eventTargetId);
    this.openDialogWantDelete(eventTargetId, "Voulez-vous vraiment supprimer le produit "+eventTargetId+" ?")
  }

  openDialogWantDelete(id, message): void {
    const dialogRef = this.dialog.open(DialogListProductOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed'+result);
      if (result=='yes') {
        this.deleteProduct(id);
      }
    });
  }


  deleteProductOld(eventTargetId) {
    console.log("deleteProduct"+eventTargetId);
    this.productsData = [];
    this.db.doc("products/"+eventTargetId).delete().then(data => {
      this.openDialogDelete("Le produit "+eventTargetId+" a été supprimé.")
    });
  }

  deleteProduct(eventTargetId) { // pour supprimer le produit dans firebase
    console.warn("deleteProduct : "+eventTargetId);
    const productDoc: AngularFirestoreDocument<Product> = this.db.doc<Product>('products/' + eventTargetId );
    // supression de la photo associée au produit dans firestorage
    productDoc.ref.get().then((product)=>{
      if (product.exists) {
        // si la photo == null, undefined, "" ou 0, renvoie false, sinon true
        console.log("product.photo :"+product.data().photo);
        if (product.data().photo) {this.storage.ref(product.data().photo).delete();} // suppression de la photo associée au produit si elle existe
        this.productsData = []; // on vide au préalable le tableau sinon les documents vont se surajouter aux anciens
        // supression du produit dans firestore
        productDoc.delete().then(data => {
          this.openDialogDelete("Le produit "+eventTargetId+" a été supprimé.")});
      }
      else {
        console.log("product doesn't exists");
      }
    });
  }

  openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogListProductOverview, {
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


