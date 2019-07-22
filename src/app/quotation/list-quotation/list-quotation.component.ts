import { Component, OnInit, OnDestroy, ViewChild, Inject } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {MatSort, MatPaginator, MatTableDataSource, MatSortable} from '@angular/material';
import { Quotation } from '../quotation';
import { Router, ActivatedRoute } from '@angular/router';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs/index";
import {firestore} from 'firebase/app';
import Timestamp = firestore.Timestamp;

export interface DialogListQuotationData { message: string; displayNoButton:boolean }
export interface QuotationId extends Quotation { id: string; }

@Component({
  selector: 'app-list-quotation',
  templateUrl: './list-quotation.component.html',
  styleUrls: ['./list-quotation.component.less']
})

export class ListQuotationComponent implements OnInit, OnDestroy {
  private fbQuotations: Observable<QuotationId[]>; // produtcs on Firebase
  private fbQuotationsSubscription : Subscription;
  displayedColumns: string[] = ['id', 'client', 'contact', 'employe', 'quotationDate', 'relaunchClientDate', 'edit', 'delete']; // colones affichées par le tableau
  private quotationsData : Array<any>; // tableau qui va récupérer les données adéquates de fbQuotations pour être ensuite affectées au tableau de sources de données
  dataSource : MatTableDataSource<QuotationId>; // source de données du tableau
  quotationTypeParams={path : "quotations",isArchived:'false', displayInTemplate:"Devis en cours"}; // les paramètres liés au type de devis (archivés ou courant)

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore, private dialog: MatDialog) {
  }

  ngOnInit() {
    // subscribe to the parameters observable
    this.route.paramMap.subscribe(params => {
      console.log(params.get('archived'));
      this.setQuotationTypeParams(this.isArchived());
      this.initFbQuotations();
    });
  }

  ngOnDestroy() {
    this.fbQuotationsSubscription.unsubscribe();
  }

  isArchived(): boolean {
    var isArchived;
    this.route.snapshot.paramMap.get('archived')==="true" ? isArchived = true : isArchived = false;
    return isArchived;
  }

  setQuotationTypeParams(isArchived:boolean) {
    console.log("isArchived :" + isArchived);
    if (isArchived) {
      this.quotationTypeParams.path='archived-quotations';
      this.quotationTypeParams.isArchived='true';
      this.quotationTypeParams.displayInTemplate= "Devis archivés";
    }
    else {
      this.quotationTypeParams.path='quotations';
      this.quotationTypeParams.isArchived='false';
      this.quotationTypeParams.displayInTemplate = "Devis en cours"
    }
  }

  initFbQuotations() {
    console.log("initFbQuotations");
    this.quotationsData = [];
    this.dataSource = new MatTableDataSource<QuotationId>(this.quotationsData);
    console.log("this.quotationTypeParams.path",this.quotationTypeParams.path);
    this.fbQuotations = this.db.collection(this.quotationTypeParams.path).snapshotChanges().pipe(
      //  this.fbQuotations = db.collection('quotations').stateChanges(['added','removed']).pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Quotation;
        const id = a.payload.doc.id;
        return {id, ...data };
      })));
    if (this.fbQuotationsSubscription instanceof  Subscription) {this.fbQuotationsSubscription.unsubscribe()}
    this.fbQuotationsSubscription = this.fbQuotations.subscribe((quotations)=>{
      console.log('Current quotations: ', quotations);
      this.quotationsData = [];
      quotations.forEach((quotation)=>{
        const client = quotation.client.name;
        const contact = quotation.contact.contactName;
        const employe = quotation.employe.name;
        const quotationDate = quotation.quotationDate;
        var relaunchClientDate;
        quotation.relaunchClientDate instanceof Timestamp ? relaunchClientDate = quotation.relaunchClientDate.toDate() : relaunchClientDate = quotation.relaunchClientDate;
        const id = quotation.id;
        this.quotationsData.push({id, client, contact, employe, quotationDate, relaunchClientDate});
      });
      this.dataSource = new MatTableDataSource<QuotationId>(this.quotationsData);
      this.dataSource.paginator = this.paginator; // pagination du tableau
      //this.sort.sort(<MatSortable>({id: 'quotationDate', start: 'desc'})); // pour trier sur la date les plus récentes
      this.dataSource.sort = this.sort; // tri sur le tableau
    });
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
  }

  editQuotation(eventTargetId) {
    console.log(eventTargetId);
    this.router.navigate(['detail-quotation/'+eventTargetId, {archived: this.quotationTypeParams.isArchived}]);
  }

  wantDeleteQuotation(eventTargetId) {
    console.log("wantDeleteQuotation"+eventTargetId);
    this.openDialogWantDelete(eventTargetId, "Voulez-vous vraiment supprimer le devis "+eventTargetId+" ?")
  }

  openDialogWantDelete(id, message): void {
    const dialogRef = this.dialog.open(DialogListQuotationOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed'+result);
      if (result=='yes') {
        this.deleteQuotation(id);
      }
    });
  }

  deleteQuotation(eventTargetId) { // pour supprimer le devis dans firebase
    console.warn("deleteQuotation : "+eventTargetId);
    const quotationDoc: AngularFirestoreDocument<Quotation> = this.db.doc<Quotation>(this.quotationTypeParams.path +'/'+ eventTargetId );
    quotationDoc.ref.get().then((quotation)=>{
      if (quotation.exists) {
        this.quotationsData = []; // on vide au préalable le tableau sinon les documents vont se surajouter aux anciens
        // supression du devis dans firestore
        quotationDoc.delete().then(data => {
          this.openDialogDelete("Le devis "+eventTargetId+" a été supprimé.")});
      }
      else {
        console.log("quotation doesn't exists");
      }
    });
  }

  openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogListQuotationOverview, {
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
  selector: 'dialog-list-quotation-overview',
  templateUrl: 'dialog-list-quotation-overview.html',
})
export class DialogListQuotationOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogListQuotationOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogListQuotationData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
