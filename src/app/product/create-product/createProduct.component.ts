import { Component, OnInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Product } from '../product';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Validators, FormGroup, FormControl, FormBuilder, FormArray } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import { AngularFireStorage } from '@angular/fire/storage';

export interface DialogCreateProductData {
  message: string;
}

@Component({
  selector: 'app-create-product',
  templateUrl: './createProduct.component.html',
  styleUrls: ['./createProduct.component.less']
})

export class CreateProductComponent implements OnInit {

  private createProductForm;
  private productsCollection: AngularFirestoreCollection<Product>;
  //private uploadPercent: Observable<number>;
  //private downloadURL: Observable<string>;
  private photoFile:File;
  @ViewChild('inputPhoto') inputPhoto: ElementRef;

  constructor(private router: Router, db: AngularFirestore, private fb: FormBuilder, private dialog: MatDialog, private storage: AngularFireStorage) {
    this.productsCollection = db.collection('products');
  }

  ngOnInit() {
    this.initForm();
  }


  /**
   * FILE GESTION
   */
/*
  convertFileToBase64(event) {
    var f = event.target.files[0]; // FileList object
    var reader = new FileReader();
    // Closure to capture the file information.
    reader.onload = (function(theFile) {
      return function(e) {
        var binaryData = e.target.result;
        //Converting Binary Data to base 64
        const encode64 = window.btoa(binaryData);
        //showing file converted to base64
        console.log('File converted to base64 successfuly!', encode64);
      };
    })(f);
    // Read in the image file as a data URL.
    reader.readAsBinaryString(f);
  }
  */


  updateFile(event) {
    this.photoFile = event.target.files[0];
   // console.log("updateFile :"+this.photoFile.name);
  }

  uploadFile() {
    console.log("uploadFile :"+this.photoFile.name + ' / '+this.photoFile);
    const fileRef = this.storage.ref('products/'+this.photoFile.name);
    // test si le fichier existe déjà
    fileRef.getDownloadURL().toPromise().then(
      onResolve=> { // le fichier existe
        this.openDialogMessage("Le fichier existe déjà, veuillez en utiliser un autre !");
      },
      onReject => {// le fichier n'existe pas, on peut l'uploader
        console.log("file doesn't exists");
        this.storage.upload('products/'+this.photoFile.name, this.photoFile);
         //this.storage.ref("products/"+this.photoFile.name).putString(encode64, 'base64', {contentType:'image/jpg'});
        this.addProduct();
      }
    );
  }

  deletePhoto(inputPhoto) {
    inputPhoto.value='';
    this.photoFile=undefined;
  }


  /**
   * END FILE GESTION
   */


  wantAddProduct() {
     if (this.photoFile!=undefined) {
      this.uploadFile();
    }
    else {
      this.addProduct();
    }
  }

  addProduct() {
    if (this.photoFile!=undefined) {this.createProductForm.value.photo='products/'+this.photoFile.name;}
    this.productsCollection.add(this.createProductForm.value).then(data => {
      console.log("Document written with ID: ", data.id);
      this.openDialogProductAdded('Le produit a bien été enregistré sous le numéro ' + data.id, data.id)});
  }

  get name() { return this.createProductForm.get('name'); }
  get internal_number() { return this.createProductForm.get('internal_number'); }
  get stock() { return this.createProductForm.get('stock'); }


  openDialogProductAdded(message, id): void {
    const dialogRef = this.dialog.open(DialogCreateProductOverview, {
      width: '450px',
      data: {message: message}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
     // this.initForm();
      this.router.navigate(['detail-product/'+id]);
    });
  }

  openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogCreateProductOverview, {
      width: '450px',
      data: {message: message}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }

  initForm() {
    this.photoFile=undefined;
    this.inputPhoto.nativeElement.value='';
     this.createProductForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      //serial_number: [''],
      internal_number: ['', Validators.required],
      //barcode: [''],
      stock: ['1', Validators.required],
      type: ['rental', Validators.required],
      sell_price : [0, Validators.required],
      rent_price : [0, Validators.required],
      apply_degressivity: ['true', Validators.required],
      photo: [''],
      comment: [''],
      date: [new Date()]
    });
    this.createProductForm.valueChanges.subscribe(data => {
      console.log('Form changes', data);
      if (data.type=='sale' || data.type=='service') {
        if (data.apply_degressivity==="true") {this.createProductForm.controls['apply_degressivity'].patchValue('false');}
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



