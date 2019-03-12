import { Component, OnInit, Inject } from '@angular/core';
import { Employe } from '../employe';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Validators, FormGroup, FormControl, FormBuilder, FormArray } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';

export interface DialogCreateEmployeData {
  id: string;
}

@Component({
  selector: 'app-create-employe',
  templateUrl: './createEmploye.component.html',
  styleUrls: ['./createEmploye.component.less']
})

export class CreateEmployeComponent implements OnInit {

  private createEmployeForm;
  private employesCollection: AngularFirestoreCollection<Employe>;

  constructor(db: AngularFirestore, private fb: FormBuilder, private dialog: MatDialog) {
    this.employesCollection = db.collection('employes');
  }

  ngOnInit() {
    this.initForm();
  }

  addEmploye() {
    this.employesCollection.add(this.createEmployeForm.value).then(data => {
      console.log("Document written with ID: ", data.id);
      this.openDialog(data.id)});
  }

  get name() { return this.createEmployeForm.get('name'); }
  get email() { return this.createEmployeForm.get('email'); }
  getEmailErrorMessage() {
    return this.email.hasError('required') ? 'Vous devez renseigner l\'émail' :
      this.email.hasError('email') ? 'L\'émail semble incorrect' :
        '';
  }


  openDialog(id): void {
    const dialogRef = this.dialog.open(DialogCreateEmployeOverview, {
      width: '450px',
      data: {id: id}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.initForm();
    });
  }

  initForm() {
     this.createEmployeForm = this.fb.group({
      name: ['', Validators.required],
      address: [''],
      zipcode: [''],
      town: [''],
      phone: ['', Validators.required],
      cellPhone: [''],
      email: ['', [Validators.required, Validators.email]],
      date: [new Date()]
    });
    this.createEmployeForm.valueChanges.subscribe(data => {
      console.log('Form changes', data);
    });
  }
}

@Component({
  selector: 'dialog-create-employe-overview',
  templateUrl: 'dialog-create-employe-overview.html',
})
export class DialogCreateEmployeOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogCreateEmployeOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogCreateEmployeData) {}
}



