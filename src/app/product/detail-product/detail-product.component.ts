import {Component, OnInit, OnDestroy, Inject, ViewChild, ElementRef} from '@angular/core';
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
import {ProductStatus} from "../ProductStatus";
import {FormArray, FormBuilder} from "@angular/forms";
import { v4 as uuidv4 } from 'uuid';

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

  //@ViewChild('inputProductStatus') inputProductStatus: ElementRef;

  private productId: String; // id du produit récupéré en paramètre de l'url
  private productSubscription : Subscription; // nécessaire pour pouvoir arrêter l'obervation du produit lorsqu'on quitte le composant (conf ngOnDestry())
  public detailProductForm; // le formulaire de mise à jour du produit utilisé par le template
  public ProductType = ProductType;
  public ProductStatus = ProductStatus;
  private uploadPhotoPercent: Observable<number>; // pour mettre à jour dans le template le pourcentage de téléchargement de la photo
  public downloadPhotoURL: Observable<string>; // l'url de la photo sur firestorage (! ce n'est pas la référence)
  public photoFile:File; //le fichier de la photo du produit à uploader
  private photoPathToDeleteOnFirestorage:string; // le nom du fichier photo à supprimer sur Firestorage
  private bug:boolean = false;
  private productFormManager: ProductFormManager ;

  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore, private dialog: MatDialog, private storage: AngularFireStorage, private fb: FormBuilder) {
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


  public updateProductByScan() {
      const productDoc: AngularFirestoreDocument<Product> = this.db.doc<Product>('products/' + this.productId );
      productDoc.update(this.detailProductForm.value).then(() => {
        this.openDialogMessage("Le produit "+this.productId+" a été mis à jour.");
        this.dialog.open(DialogDetailProductOverview, {
          width: '450px',
          data: {
            message: "Le produit " + this.productId + " a été mis à jour.",
            displayNoButton:false
          }
        });
        setTimeout(()=> {
          this.dialog.closeAll();
          this.router.navigate(["/list-products"]);
        }, 2000)
      });

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
          this.setProductItems(product);
          this.detailProductForm.patchValue(product);
          // pour mise à jour de l'uuid de qrcode généré dans setProductItems pourles produits à la vente antérieurs à la mise en place des stocks de type "productItem"
          if (!product.productItems && product.type === ProductType.sale) {
            this.db.doc<Product>('products/' + productId ).update({productItems: [this.detailProductForm.controls.productItems.controls[0].value]});
          }
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

  /* used for add or remove productItems*/
  get productItems() {
    return this.detailProductForm.get('productItems') as FormArray;
  }


  private setProductItems(product) {
    while (this.productItems.length !== 0) {
      this.productItems.removeAt(0)
    }
    if (product.productItems) {
      for (let i=0; i<product.productItems.length; i++) {
        this.addProductItem(product.type === ProductType.sale);
      }
    }
    // si les productItems n'ont pas été définis, on se base sur la propriété stock
    else {
      for (let i=0; i<product.stock; i++) {
        this.addProductItem(product.type === ProductType.sale);
      }
    }
  }

  addProductItem(generateUuid: boolean) {
    let uuid: string = '';
    generateUuid ? uuid = uuidv4() : null;
    this.productItems.push(this.fb.group({number: [uuid], status: [ProductStatus.Available]}));
  }

  rmProductItem(i) {
    if (i > 0) {
      this.productItems.removeAt(Number(i));

    }
    else if (i === 0) {
      this.detailProductForm.controls.productItems.controls[0].patchValue({number: "", status: ProductStatus.Available});
    }
  }

  private initForm() {
    this.detailProductForm = this.productFormManager.getForm();
    this.detailProductForm.valueChanges.subscribe(data => {
      //console.log('Form changes', data);
      //console.log ("photoFile : "+this.photoFile);
      if (this.bug==true) {this.detailProductForm.value.photo='';}
      if (data.type === ProductType.sale || data.type === ProductType.service) {
        if (data.apply_degressivity === "true") {this.detailProductForm.controls['apply_degressivity'].patchValue('false');}
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

  public setProductStatus(value: string, idxProductItem) {
    if (["AVAILABLE", "UNAVAILABLE", "MAINTENANCE", "SOLD"].includes(value)) {
      this.productItems.controls[idxProductItem].get('status').patchValue(value);
      this.updateProductByScan();
    } else {
      this.resetInputProductStatus();
    }
  }

  public resetInputProductStatus() {
    //this.inputProductStatus.nativeElement.value = "";
    //this.inputProductStatus.nativeElement.focus();
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
