import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Product } from '../product';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs'
import { tap, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs";
import { AngularFireStorage } from '@angular/fire/storage';
import {ProductFormManager} from "../../forms/productFormManager";
import {ProductType} from "../ProductType";

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
  public detailProductForm; // le formulaire de mise à jour du produit utilisé par le template
  public ProductType = ProductType;
  private uploadPhotoPercent: Observable<number>; // pour mettre à jour dans le template le pourcentage de téléchargement de la photo
  public downloadPhotoURL: Observable<string>; // l'url de la photo sur firestorage (! ce n'est pas la référence)
  public photoFile:File; //le fichier de la photo du produit à uploader
  private photoPathToDeleteOnFirestorage:string; // le nom du fichier photo à supprimer sur Firestorage
  private bug:boolean = false;
  private productFormManager: ProductFormManager ;

  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore, private dialog: MatDialog, private storage: AngularFireStorage) {
    this.productFormManager = new ProductFormManager();
  }

  ngOnInit() {
    this.productId = this.getproductId();
    this.initForm();
    this.observeProduct(this.productId);
  }

  ngOnDestroy() {
    this.productSubscription.unsubscribe();
  }

  public updateProduct() {
    //console.log(this.detailProductForm.value);
    if (this.photoPathToDeleteOnFirestorage!=undefined) {this.deletePhotoOnFirestorage();}
    if (this.photoFile!=undefined) {
      this.uploadFile();
    }
    else {
      const productDoc: AngularFirestoreDocument<Product> = this.db.doc<Product>('products/' + this.productId );
      productDoc.update(this.detailProductForm.value).then(() => {
        this.openDialogMessage("Le produit "+this.productId+" a été mis à jour.");
      });
    }
  }

  private updateProductAfterUploadFile() {
    this.detailProductForm.value.photo='products/'+this.photoFile.name;
    const productDoc: AngularFirestoreDocument<Product> = this.db.doc<Product>('products/' + this.productId );
    productDoc.update(this.detailProductForm.value).then(()=> {
      this.openDialogMessage("Le produit " + this.productId + " a été mis à jour.");
      this.photoFile = undefined;});
  }

  public wantDeleteProduct() {
    //console.warn("wantDeleteProduct"+this.productId);
    this.openDialogWantDelete("Voulez-vous vraiment supprimer le produit "+this.productId+" ?");
  }

  private deleteProduct() { // pour supprimer le produit dans firebase
    //console.warn("deleteProduct : "+this.productId);
    const productDoc: AngularFirestoreDocument<Product> = this.db.doc<Product>('products/' + this.productId );
    // supression de la photo associée au produit dans firestorage
    productDoc.ref.get().then((product)=>{
         if (product.exists) {
        //console.log("product.photo :"+product.data().photo);
           // si la photo == null, undefined, "" ou 0, renvoie false, sinon true
        if (product.data().photo) {this.storage.ref(product.data().photo).delete();}
         }
      else {
           //console.log("product doesn't exists");
         }
      });
    // supression du produit dans firestore
    productDoc.delete().then(() => {
      this.openDialogDelete("Le produit "+this.productId+" a été supprimé.")});
  }


  private observeProduct(productId: String) {
    //console.log("observeProduct : "+productId);
    const product: Observable<Product> = this.db.doc<Product>('products/'+productId).valueChanges().pipe(
      tap(product => {
        if (product != undefined) {
          this.detailProductForm.patchValue(product);
          if (product.photo!='') {
            //console.log("observeProduct : photo exist");
            this.downloadPhotoURL = this.storage.ref(product.photo).getDownloadURL();
          } else {this.downloadPhotoURL = undefined}
        }
      })
    );
    this.productSubscription = product.subscribe();
  }

  private getproductId(): string {
    return this.route.snapshot.paramMap.get('productId');
  }

  get name() { return this.detailProductForm.get('name'); }
  get internal_number() { return this.detailProductForm.get('internal_number'); }
  get stock() { return this.detailProductForm.get('stock'); }

  private initForm() {
    this.detailProductForm = this.productFormManager.getForm();
    this.detailProductForm.valueChanges.subscribe(data => {
      //console.log('Form changes', data);
      //console.log ("photoFile : "+this.photoFile);
      if (this.bug==true) {this.detailProductForm.value.photo='';}
      if (data.type === ProductType.sale || data.type === ProductType.service) {
        if (data.apply_degressivity === "true") {this.detailProductForm.controls['apply_degressivity'].patchValue('false');}
        //this.detailProductForm.value.apply_degressivity="false";
      }
    });
  }

  private openDialogMessage(message): void {
    const dialogRef = this.dialog.open(DialogDetailProductOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe();
  }

  private openDialogWantDelete(message): void {
    const dialogRef = this.dialog.open(DialogDetailProductOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      //console.log('The dialog was closed');
      if (result=='yes') {
        this.deleteProduct();
      }
    });
  }

  private openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogDetailProductOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['list-products/']).then();
    });
  }


  /**
   * FILE GESTION
   */
  public updateFile(event) {
    //todo deleteFileBefore
    this.photoFile = event.target.files[0];
    //console.log("updateFile :"+this.photoFile.name);
    this.bug=false;
  }

  private uploadFile() {
    //console.log("uploadFile :"+this.photoFile.name);
    const fileRef = this.storage.ref('products/'+this.photoFile.name);
    // test si le fichier existe déjà
    fileRef.getDownloadURL().toPromise().then(
      () => { // le fichier existe
       // alert("Le fichier existe déjà, veuillez en utiliser un autre");
        this.openDialogMessage("Le fichier existe déjà, veuillez en utiliser un autre");
      },
      () => {// le fichier n'existe pas, on peut l'uploader
        //console.log("file doesn't exists");
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


  public deleteInputPhoto(inputPhoto) {
    //console.log("deleteInputPhoto");
    inputPhoto.value='';
    this.photoFile=undefined;
  }

  public wantDeletePhotoOnFirestorage() {
    //console.log("wantDeletePhotoOnFirestorage");
    // prepare delete photo on storage when user save form
    this.downloadPhotoURL = undefined;
    this.photoPathToDeleteOnFirestorage=this.detailProductForm.value.photo;
    //console.log("wantDeletePhotoOnFirestorage : "+ this.photoPathToDeleteOnFirestorage);
    this.detailProductForm.value.photo='';
    this.bug=true;
    //console.log(this.detailProductForm.value);
  }

  private deletePhotoOnFirestorage() {
    //console.log("deletePhotoOnFirestorage"+this.photoPathToDeleteOnFirestorage);
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
