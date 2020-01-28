import { Component, OnInit, OnDestroy, ViewChild, Inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatSort, MatPaginator, MatTableDataSource } from '@angular/material';
import { ServiceContract } from '../service-contract';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Subscription } from "rxjs";

export interface DialogListServiceContractData { message: string; displayNoButton:boolean }
export interface ServiceContractId extends ServiceContract { id: string; }

@Component({
  selector: 'app-list-service-contract',
  templateUrl: './list-service-contract.component.html',
  styleUrls: ['./list-service-contract.component.less']
})

export class ListServiceContractComponent implements OnInit, OnDestroy {
  private fbServiceContracts: Observable<ServiceContractId[]>; // produtcs on Firebase
  private fbServiceContractsSubscription : Subscription;
  public displayedColumns: string[] = ['id', 'quotationId', 'client', 'contact', 'orderDate', 'edit']; // colones affichées par le tableau
  private serviceContractsData : Array<any>; // tableau qui va récupérer les données adéquates de fbServiceContracts pour être ensuite affectées au tableau de sources de données
  public dataSource : MatTableDataSource<ServiceContractId>; // source de données du tableau
  public serviceContractTypeParams={path : "service-contracts",isArchived:'false', displayInTemplate:"Contrats de maintenance en cours"}; // les paramètres liés au type de commande (archivées ou courantes)

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
    //console.log("isArchived :" + isArchived);
    if (isArchived) {
      this.serviceContractTypeParams.path='archived-service-contracts';
      this.serviceContractTypeParams.isArchived='true';
      this.serviceContractTypeParams.displayInTemplate= "Contrats de maintenance archivés";
    }
    else {
      this.serviceContractTypeParams.path='service-contracts';
      this.serviceContractTypeParams.isArchived='false';
      this.serviceContractTypeParams.displayInTemplate = "Contrats de maintenance en cours"
    }
  }

  private initFbServiceContracts() {
    //console.log("initFbServiceContracts");
    this.serviceContractsData = [];
    this.dataSource = new MatTableDataSource<ServiceContractId>(this.serviceContractsData);
    //console.log("this.listInvoiceTitle.path",this.serviceContractTypeParams.path);
    this.fbServiceContracts = this.db.collection(this.serviceContractTypeParams.path).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as ServiceContract;
        const id = a.payload.doc.id;
        return {id, ...data };
      })));
    if (this.fbServiceContractsSubscription instanceof  Subscription) {this.fbServiceContractsSubscription.unsubscribe()}
    this.fbServiceContractsSubscription = this.fbServiceContracts.subscribe((serviceContracts)=>{
      //console.log('Current serviceContracts: ', serviceContracts);
      this.serviceContractsData = [];
      serviceContracts.forEach((serviceContract)=>{
        let quotationId;
        serviceContract.quotationId!=undefined ? quotationId = serviceContract.quotationId : quotationId="";
        this.serviceContractsData.push({id : serviceContract.id, quotationId, client : serviceContract.client.name, contact : serviceContract.contact.contactName, orderDate : serviceContract.orderDate});
      });
      this.dataSource = new MatTableDataSource<ServiceContractId>(this.serviceContractsData);
      this.dataSource.paginator = this.paginator; // pagination du tableau
      //this.sort.sort(<MatSortable>({id: 'orderDate', start: 'desc'})); // pour trier sur la date les plus récentes
      this.dataSource.sort = this.sort; // tri sur le tableau
    });
  }

  public applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
  }

  public editServiceContract(eventTargetId) {
    //console.log(eventTargetId);
    this.router.navigate(['detail-service-contract/'+eventTargetId, {archived: this.serviceContractTypeParams.isArchived}]).then();
  }
}

@Component({
  selector: 'dialog-list-service-contract-overview',
  templateUrl: 'dialog-list-service-contract-overview.html',
})
export class DialogListServiceContractOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogListServiceContractOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogListServiceContractData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
