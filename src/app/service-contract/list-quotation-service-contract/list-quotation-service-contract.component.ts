import { Component, OnInit, OnDestroy, ViewChild, Inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatSort, MatPaginator, MatTableDataSource } from '@angular/material';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Subscription } from "rxjs";
import {QuotationServiceContract} from "../quotation-service-contract";
export interface DialogListQuotationServiceContractData { message: string; displayNoButton:boolean }
export interface QuotationServiceContractId extends QuotationServiceContract { id: string; }

@Component({
  selector: 'app-list-quotation-service-contract',
  templateUrl: './list-quotation-service-contract.component.html',
  styleUrls: ['./list-quotation-service-contract.component.less']
})

export class ListQuotationServiceContractComponent implements OnInit, OnDestroy {
  private fbServiceContracts: Observable<QuotationServiceContractId[]>; // produtcs on Firebase
  private fbServiceContractsSubscription : Subscription;
  public displayedColumns: string[] = ['id', 'fromServiceContractId', 'client', 'contact', 'quotationDate', 'edit']; // colones affichées par le tableau
  private serviceContractsData : Array<any>; // tableau qui va récupérer les données adéquates de fbServiceContracts pour être ensuite affectées au tableau de sources de données
  public dataSource : MatTableDataSource<QuotationServiceContractId>; // source de données du tableau
  public serviceContractTypeParams={path : "quotation-service-contracts",isArchived:'false', displayInTemplate:"Devis de renouvellement de contrats de maintenance en cours"}; // les paramètres liés au type de commande (archivées ou courantes)

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore) {
  }

  ngOnInit() {
    this.route.paramMap.subscribe(() => {
      this.setServiceContractTypeParams(this.isArchived());
      this.initFbServiceContracts();
    });
  }

  ngOnDestroy() {
    this.fbServiceContractsSubscription.unsubscribe();
  }

  private isArchived() : boolean {
    return this.route.snapshot.paramMap.get('archived') === "true";
  }

  private setServiceContractTypeParams( isArchived : boolean ) {
    if (isArchived) {
      this.serviceContractTypeParams.path='archived-quotation-service-contracts';
      this.serviceContractTypeParams.isArchived='true';
      this.serviceContractTypeParams.displayInTemplate= "Devis archivés de renouvellement de contrats de maintenance.";
    }
    else {
      this.serviceContractTypeParams.path='quotation-service-contracts';
      this.serviceContractTypeParams.isArchived='false';
      this.serviceContractTypeParams.displayInTemplate = "Devis en cours de renouvellement de contrats de maintenance."
    }
  }

  private initFbServiceContracts() {
    //console.log("initFbServiceContracts");
    this.serviceContractsData = [];
    this.dataSource = new MatTableDataSource<QuotationServiceContractId>(this.serviceContractsData);
    //console.log("this.listInvoiceTitle.path",this.serviceContractTypeParams.path);
    this.fbServiceContracts = this.db.collection(this.serviceContractTypeParams.path).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as QuotationServiceContract;
        const id = a.payload.doc.id;
        return {id, ...data };
      })));
    if (this.fbServiceContractsSubscription instanceof  Subscription) {this.fbServiceContractsSubscription.unsubscribe()}
    this.fbServiceContractsSubscription = this.fbServiceContracts.subscribe((serviceContracts)=>{
      this.serviceContractsData = [];
      serviceContracts.forEach((serviceContract)=>{
        this.serviceContractsData.push({id : serviceContract.id, fromServiceContractId: serviceContract.fromServiceContractId, client : serviceContract.client.name, contact : serviceContract.contact.contactName, quotationDate : serviceContract.quotationDate});
      });
      this.dataSource = new MatTableDataSource<QuotationServiceContractId>(this.serviceContractsData);
      this.dataSource.paginator = this.paginator; // pagination du tableau
      this.dataSource.sort = this.sort; // tri sur le tableau
    });
  }

  public applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
  }

  public editElement(eventTargetId) {
    this.router.navigate(['quotation-service-contract/'+eventTargetId, {archived: this.serviceContractTypeParams.isArchived}]).then();
  }
}

@Component({
  selector: 'dialog-list-quotation-service-contract-overview',
  templateUrl: 'dialog-list-quotation-service-contract-overview.html',
})
export class DialogListQuotationServiceContractOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogListQuotationServiceContractOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogListQuotationServiceContractData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
