import { Component, OnInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Product } from '../product';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import { AngularFireStorage } from '@angular/fire/storage';
import {ProductFormManager} from "../../forms/productFormManager";
import {ProductType} from "../ProductType";

export interface DialogCreateProductData {
  message: string;
}

@Component({
  selector: 'app-create-product',
  templateUrl: './createProduct.component.html',
  styleUrls: ['./createProduct.component.less']
})

export class CreateProductComponent implements OnInit {

  public createProductForm;
  public photoFile:File;

  private productsCollection: AngularFirestoreCollection<Product>;

  public ProductType = ProductType;

  private productFormManager : ProductFormManager;

  @ViewChild('inputPhoto') inputPhoto: ElementRef;

  constructor(private router: Router, db: AngularFirestore, private storage: AngularFireStorage, private dialog: MatDialog) {
    this.productsCollection = db.collection('products');
    this.productFormManager = new ProductFormManager();
  }

  ngOnInit() {
    this.initForm();
  }

  public updateFile(event) {
    this.photoFile = event.target.files[0];
  }

  private uploadFile() {
    console.log("uploadFile :"+this.photoFile.name + ' / '+this.photoFile);
    const fileRef = this.storage.ref('products/'+this.photoFile.name);
    // test si le fichier existe déjà
    fileRef.getDownloadURL().toPromise().then(
      ()=> { // le fichier existe
        this.openDialogMessage("Le fichier existe déjà, veuillez en utiliser un autre !");
      },
      () => {// le fichier n'existe pas, on peut l'uploader
        console.log("file doesn't exists");
        this.storage.upload('products/'+this.photoFile.name, this.photoFile);
        this.addProduct();
      }
    );
  }

  public deletePhoto(inputPhoto) {
    inputPhoto.value='';
    this.photoFile=undefined;
  }

  public wantAddProduct() {
     if (this.photoFile!=undefined) {
      this.uploadFile();
    }
    else {
      this.addProduct();
    }
  }

  private addProduct() {
    if (this.photoFile!=undefined) {this.createProductForm.value.photo='products/'+this.photoFile.name;}
    this.productsCollection.add(this.createProductForm.value).then(data => {
      console.log("Document written with ID: ", data.id);
      this.openDialogProductAdded('Le produit a bien été enregistré sous le numéro ' + data.id, data.id)});
  }

  get name() { return this.createProductForm.get('name'); }
  get internal_number() { return this.createProductForm.get('internal_number'); }
  get stock() { return this.createProductForm.get('stock'); }


  private openDialogProductAdded(message, id): void {
    const dialogRef = this.dialog.open(DialogCreateProductOverview, {
      width: '450px',
      data: {message: message}
    });

    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['detail-product/' + id]).then();
    });
  }

  private openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogCreateProductOverview, {
      width: '450px',
      data: {message: message}
    });

    dialogRef.afterClosed().subscribe();
  }

  private initForm() {
    this.photoFile = undefined;
    this.inputPhoto.nativeElement.value = '';
    this.createProductForm = this.productFormManager.getForm();
    this.createProductForm.valueChanges.subscribe(data => {
      console.log('Form changes', data);
      if (data.type === ProductType.sale || data.type === ProductType.service) {
        if (data.apply_degressivity === "true") {this.createProductForm.controls['apply_degressivity'].patchValue('false');}
      }
    });
  }
}

@Component({
  selector: 'dialog-create-product-overview',
  templateUrl: 'dialog-create-product-overview.html',
})
export class DialogCreateProductOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogCreateProductOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogCreateProductData) {}
}



