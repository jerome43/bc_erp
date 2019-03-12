import { Component, OnInit, OnDestroy, ViewChild, Inject } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {MatSort, MatPaginator, MatTableDataSource, MatSortable} from '@angular/material';
import { Employe } from '../employe';
import { Router } from '@angular/router';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs/index";

export interface DialogListEmployeData { message: string; displayNoButton:boolean }
export interface EmployeId extends Employe { id: string; }

@Component({
  selector: 'app-list-employe',
  templateUrl: './list-employe.component.html',
  styleUrls: ['./list-employe.component.less']
})

export class ListEmployeComponent implements OnInit, OnDestroy {
  private fbEmployes: Observable<EmployeId[]>; // employes on Firebase
  private fbEmployesSubscription : Subscription;
  private displayedColumns: string[] = ['name', 'date', 'edit', 'delete', 'id']; // colones affichées par le tableau
  private employesData : Array<any>; // tableau qui va récupérer les données adéquates de fbEmployes pour être ensuite affectées au tableau de sources de données
  private dataSource : MatTableDataSource<EmployeId>; // source de données du tableau

  @ViewChild(MatPaginator) paginator: MatPaginator; // pagination du tableau
  @ViewChild(MatSort) sort: MatSort; // tri sur le tableau

  constructor(private router: Router, private db: AngularFirestore, private dialog: MatDialog) {
  }

  ngOnInit() {
    this.initListEmployes();
  }

  ngOnDestroy() {
    this.fbEmployesSubscription.unsubscribe();
  }

  initListEmployes() {
    this.fbEmployes = this.db.collection('employes').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Employe;
        const id = a.payload.doc.id;
        return {id, ...data };
      })));
    if (this.fbEmployesSubscription instanceof  Subscription) {this.fbEmployesSubscription.unsubscribe()}
    this.fbEmployesSubscription = this.fbEmployes.subscribe((employes)=>{
       console.log('Current employes: ', employes);
        this.employesData = [];
        employes.forEach((employe)=> {
          const id = employe.id;
          const name = employe.name;
          const date = employe.date;
          this.employesData.push({id, name, date});
        });
        console.log("this.employesData : ", this.employesData);
        this.dataSource = new MatTableDataSource<EmployeId>(this.employesData);
        this.dataSource.paginator = this.paginator; // pagination du tableau
        //this.sort.sort(<MatSortable>({id: 'name', start: 'desc'})); // pour trier sur les noms par ordre alphabétique
        this.dataSource.sort = this.sort; // tri sur le tableau
    });
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase(); // filtre sur le tableau
  }

  editEmploye(eventTargetId) {
    console.log(eventTargetId);
    this.router.navigate(['detail-employe/'+eventTargetId]);
  }

  wantDeleteEmploye(eventTargetId) {
    console.log("wantDeleteEmploye"+eventTargetId);
    this.openDialogWantDelete(eventTargetId, "Voulez-vous vraiment supprimer l'employe "+eventTargetId+" ?")
  }

  openDialogWantDelete(id, message): void {
    const dialogRef = this.dialog.open(DialogListEmployeOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed'+result);
      if (result=='yes') {
        this.deleteEmploye(id);
      }
    });
  }


  deleteEmploye(eventTargetId) {
    console.log("deleteEmploye"+eventTargetId);
    this.employesData = [];
    this.db.doc("employes/"+eventTargetId).delete().then(data => {
      this.openDialogDelete("L'employe "+eventTargetId+" a été supprimé.")
    });
  }

  openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogListEmployeOverview, {
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
  selector: 'dialog-list-employe-overview',
  templateUrl: 'dialog-list-employe-overview.html',
})
export class DialogListEmployeOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogListEmployeOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogListEmployeData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}


