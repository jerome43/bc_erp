import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Product } from '../product';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs'
import { tap, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Validators, FormGroup, FormControl, FormBuilder, FormArray  } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs/index";
import { AngularFireStorage } from '@angular/fire/storage';
import {filter} from "rxjs/internal/operators/filter";

export interface DialogDetailProductData {
  message: string;
  displayNoButton:boolean;
}

@Component({
  selector: 'app-detail-product',
  templateUrl: './detail-product.component.html',
  styleUrls: ['./detail-product.component.less']
})

export class DetailProductComponent implements OnInit, OnDestroy {
  private productId: String; // id du produit récupéré en paramètre de l'url
  private productSubscription : Subscription; // nécessaire pour pouvoir arrêter l'obervation du produit lorsqu'on quitte le composant (conf ngOnDestry())
  private detailProductForm; // le formulaire de mise à jour du produit utilisé par le template
  private isSellable: boolean; // utilisé pour indiquer si le produit est en vente (true) ou en location (false)
  private apply_degressivity:boolean;// utilisé pour indiquer si c'est un produit en location de type degressif (true) ou de type prestation de service (false)
  private uploadPhotoPercent: Observable<number>; // pour mettre à jour dans le template le pourcentage de téléchargement de la photo
  private downloadPhotoURL: Observable<string>; // l'url de la photo sur firestorage (! ce n'est pas la référence)
  private photoFile:File; //le fichier de la photo du produit à uploader
  private photoPathToDeleteOnFirestorage:string; // le nom du fichier photo à supprimer sur Firestorage
  private bug:boolean = false;

  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore, private fb: FormBuilder, private dialog: MatDialog, private storage: AngularFireStorage) {
  }

  ngOnInit() {
    this.productId = this.getproductId();
    this.initForm();
    this.observeProduct(this.productId);
  }

  ngOnDestroy() {
    this.productSubscription.unsubscribe();
  }

  updateProduct() {
    console.log(this.detailProductForm.value);
    if (this.photoPathToDeleteOnFirestorage!=undefined) {this.deletePhotoOnFirestorage();}
    if (this.photoFile!=undefined) {
      this.uploadFile();
    }
    else {
      const productDoc: AngularFirestoreDocument<Product> = this.db.doc<Product>('products/' + this.productId );
      productDoc.update(this.detailProductForm.value).then(data => {
        this.openDialogMessage("Le produit "+this.productId+" a été mis à jour.");
      });
    }
  }

  updateProductAfterUploadFile() {
    this.detailProductForm.value.photo='products/'+this.photoFile.name;
    const productDoc: AngularFirestoreDocument<Product> = this.db.doc<Product>('products/' + this.productId );
    productDoc.update(this.detailProductForm.value).then(data => {
      this.openDialogMessage("Le produit "+this.productId+" a été mis à jour.");
      this.photoFile=undefined;});
  }

  wantDeleteProduct() {
    console.warn("wantDeleteProduct"+this.productId);
    this.openDialogWantDelete("Voulez-vous vraiment supprimer le produit "+this.productId+" ?");
  }

  deleteProduct() { // pour supprimer le produit dans firebase
    console.warn("deleteProduct : "+this.productId);
    const productDoc: AngularFirestoreDocument<Product> = this.db.doc<Product>('products/' + this.productId );
    // supression de la photo associée au produit dans firestorage
    productDoc.ref.get().then((product)=>{
         if (product.exists) {
        console.log("product.photo :"+product.data().photo);
           // si la photo == null, undefined, "" ou 0, renvoie false, sinon true
        if (product.data().photo) {this.storage.ref(product.data().photo).delete();}
         }
      else {
           console.log("product doesn't exists");
         }
      });
    // supression du produit dans firestore
    productDoc.delete().then(data => {
      this.openDialogDelete("Le produit "+this.productId+" a été supprimé.")});
  }


  observeProduct(productId: String) {
    console.log("observeProduct : "+productId);
    const product: Observable<Product> = this.db.doc<Product>('products/'+productId).valueChanges().pipe(
      tap(product => {
        if (product != undefined) {
          this.detailProductForm.patchValue(product);
          if (product.photo!='') {console.log("observeProduct : photo exist"); this.downloadPhotoURL = this.storage.ref(product.photo).getDownloadURL();} else {this.downloadPhotoURL = undefined}
        }
      })
    );
    this.productSubscription = product.subscribe({
      next(product) { console.log('Current product ', product); },
      error(msg) { console.log('Error Getting product ', msg);},
      complete() {console.log('complete')}
    });
  }

  getproductId(): string {
    return this.route.snapshot.paramMap.get('productId');
  }

  get name() { return this.detailProductForm.get('name'); }
  get internal_number() { return this.detailProductForm.get('internal_number'); }
  get stock() { return this.detailProductForm.get('stock'); }

  initForm() {
    this.isSellable=false;
    this.apply_degressivity=true;
    this.detailProductForm = this.fb.group({
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
    this.detailProductForm.valueChanges.subscribe(data => {
      console.log('Form changes', data);
      console.log ("photoFile : "+this.photoFile);
      if (this.bug==true) {this.detailProductForm.value.photo='';}
      if (data.type=='sale' || data.type=="service") {
        this.isSellable=true;
        if (data.apply_degressivity==="true") {this.detailProductForm.controls['apply_degressivity'].patchValue('false');}
        //this.detailProductForm.value.apply_degressivity="false";
      }
      else {this.isSellable=false}

      if (data.apply_degressivity=='true') {
        this.apply_degressivity=true;
      }
      else {this.apply_degressivity=false}
    });
  }

  openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogDetailProductOverview, {
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

  openDialogWantDelete(message): void {
    const dialogRef = this.dialog.open(DialogDetailProductOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      if (result=='yes') {
        this.deleteProduct();
      }
    });
  }

  openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogDetailProductOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.router.navigate(['list-products/']);
    });
  }


  /**
   * FILE GESTION
   */
  updateFile(event) {
    //todo deleteFileBefore
    this.photoFile = event.target.files[0];
    console.log("updateFile :"+this.photoFile.name);
    this.bug=false;
  }

  uploadFile() {
    console.log("uploadFile :"+this.photoFile.name);
    const fileRef = this.storage.ref('products/'+this.photoFile.name);
    // test si le fichier existe déjà
    fileRef.getDownloadURL().toPromise().then(
      onResolve=> { // le fichier existe
       // alert("Le fichier existe déjà, veuillez en utiliser un autre");
        this.openDialogMessage("Le fichier existe déjà, veuillez en utiliser un autre");
      },
      onReject => {// le fichier n'existe pas, on peut l'uploader
        console.log("file doesn't exists");
        const fileRef = this.storage.ref('products/'+this.photoFile.name);
        const task = this.storage.upload('products/'+this.photoFile.name, this.photoFile);

        // observe percentage changes
        this.uploadPhotoPercent = task.percentageChanges();
        // get notified when the download URL is available
        task.snapshotChanges().pipe(
          finalize(() => {
            this.downloadPhotoURL = fileRef.getDownloadURL();
            this.updateProductAfterUploadFile();
          } )
          )
          .subscribe()
      }
    );
  }


  deleteInputPhoto(inputPhoto) {
    console.log("deleteInputPhoto");
    inputPhoto.value='';
    this.photoFile=undefined;
  }

  wantDeletePhotoOnFirestorage() {
    console.log("wantDeletePhotoOnFirestorage");
    // prepare delete photo on storage when user save form
    this.downloadPhotoURL=undefined;
    this.photoPathToDeleteOnFirestorage=this.detailProductForm.value.photo;
    console.log("wantDeletePhotoOnFirestorage : "+ this.photoPathToDeleteOnFirestorage);
    this.detailProductForm.value.photo='';
    this.bug=true;
    console.log(this.detailProductForm.value);
  }

  deletePhotoOnFirestorage() {
    console.log("deletePhotoOnFirestorage"+this.photoPathToDeleteOnFirestorage);
    this.storage.ref(this.photoPathToDeleteOnFirestorage).delete();
    this.photoPathToDeleteOnFirestorage=undefined;
  }

  /**
   * END FILE GESTION
   */
}

@Component({
  selector: 'dialog-detail-product-overview',
  templateUrl: 'dialog-detail-product-overview.html',
})
export class DialogDetailProductOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogDetailProductOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogDetailProductData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
