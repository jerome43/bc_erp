import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Employe } from '../employe';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Validators, FormGroup, FormControl, FormBuilder, FormArray  } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {Subscription} from "rxjs/index";

export interface DialogDetailEmployeData {
  message: string;
  displayNoButton:boolean;
}

@Component({
  selector: 'app-detail-employe',
  templateUrl: './detail-employe.component.html',
  styleUrls: ['./detail-employe.component.less']
})

export class DetailEmployeComponent implements OnInit, OnDestroy {
  private employeId: String;
  private employeDoc: AngularFirestoreDocument<Employe>;
  private employe: Observable<Employe>;
  private employeSubscription : Subscription;
  private detailEmployeForm;

  constructor(private router: Router, private route: ActivatedRoute, private db: AngularFirestore, private fb: FormBuilder, private dialog: MatDialog) {
  }

  ngOnInit() {
    this.employeId = this.getEmployeId();
    this.initForm();
    this.observeEmploye(this.employeId);
  }

  ngOnDestroy() {
    this.employeSubscription.unsubscribe();
  }

  updateEmploye() {
    console.warn(this.detailEmployeForm.value);
    this.employeDoc = this.db.doc<Employe>('employes/' + this.employeId );
    this.employeDoc.update(this.detailEmployeForm.value).then(data => {
      this.openDialogUpdate("L'employé "+this.employeId+" a été mis à jour.")});
  }

  wantDeleteEmploye() {
    console.warn("wantDeleteEmploye"+this.employeId);
    this.openDialogWantDelete("Voulez-vous vraiment supprimer l'employé "+this.employeId+" ?");
  }

  deleteEmploye() {
    console.warn("deleteEmploye"+this.employeId);
    this.employeDoc = this.db.doc<Employe>('employes/' + this.employeId );
    this.employeDoc.delete().then(data => {
      this.openDialogDelete("L'employé "+this.employeId+" a été supprimé.")});
  }


  observeEmploye(employeId: String) {
    console.log("observeEmploye : "+employeId);
    this.employe = this.db.doc<Employe>('employes/'+employeId).valueChanges().pipe(
      tap(employe => {
        if (employe != undefined) {
          this.detailEmployeForm.patchValue(employe);
        }
      })
    );
    this.employeSubscription = this.employe.subscribe({
      next(employe) { console.log('Current employes ', employe); },
      error(msg) { console.log('Error Getting employe ', msg);},
      complete() {console.log('complete')}
    });
  }

  getEmployeId(): string {
    return this.route.snapshot.paramMap.get('employeId');
  }


  get name() { return this.detailEmployeForm.get('name'); }

  get email() { return this.detailEmployeForm.get('email'); }

  getEmailErrorMessage() {
    return this.email.hasError('required') ? 'Vous devez renseigner l\'émail' :
      this.email.hasError('email') ? 'L\'émail semble incorrect' :
        '';
  }

  initForm() {
    this.detailEmployeForm = this.fb.group({
      name: ['', Validators.required],
      address: [''],
      zipcode: [''],
      town: [''],
      phone: ['', Validators.required],
      cellPhone: [''],
      email: ['', [Validators.required, Validators.email]],
      date: ['']
    });

    this.detailEmployeForm.valueChanges.subscribe(data => {
      console.log('Form changes', data);
    });
  }

  openDialogUpdate(message): void {
    const dialogRef = this.dialog.open(DialogDetailEmployeOverview, {
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
    const dialogRef = this.dialog.open(DialogDetailEmployeOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      if (result=='yes') {
        this.deleteEmploye();
      }
    });
  }

  openDialogDelete(message): void {
    const dialogRef = this.dialog.open(DialogDetailEmployeOverview, {
      width: '450px',
      data: {
        message: message,
        displayNoButton:false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.router.navigate(['list-employes/']);
    });
  }
}

@Component({
  selector: 'dialog-detail-employe-overview',
  templateUrl: 'dialog-detail-employe-overview.html',
})
export class DialogDetailEmployeOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogDetailEmployeOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogDetailEmployeData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
