import { Component, OnInit, Inject } from '@angular/core';
import { Client } from '../client';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Validators, FormGroup, FormControl, FormBuilder, FormArray } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';

export interface DialogCreateClientData {
  id: string;
}

@Component({
  selector: 'app-create-client',
  templateUrl: './createClient.component.html',
  styleUrls: ['./createClient.component.less']
})

export class CreateClientComponent implements OnInit {

  createClientForm;
  private clientsCollection: AngularFirestoreCollection<Client>;

  constructor(db: AngularFirestore, private fb: FormBuilder, private dialog: MatDialog) {
    this.clientsCollection = db.collection('clients');
  }

  ngOnInit() {
    this.initForm();
  }

  addClient() {
    this.clientsCollection.add(this.createClientForm.value).then(data => {
      console.log("Document written with ID: ", data.id);
      this.openDialog(data.id)});
  }


  get contacts() {
    return this.createClientForm.get('contacts') as FormArray;
  }

  addContacts() {
    this.contacts.push(this.fb.group({
      contactName: [''],
      contactFunction: [''],
      contactPhone: [''],
      contactCellPhone: [''],
      contactEmail: ['', [Validators.email]]}));
  }

  rmContacts(i) {
    //console.log("rmContact : "+i);
    this.contacts.removeAt(Number(i));
  }

  get name() { return this.createClientForm.get('name'); }
  /*
  get email() { return this.createClientForm.get('email'); }
  getEmailErrorMessage() {
    return this.email.hasError('required') ? 'Vous devez renseigner l\'émail' :
      this.email.hasError('email') ? 'L\'émail semble incorrect' :
        '';
  }
  */


  openDialog(id): void {
    const dialogRef = this.dialog.open(DialogCreateClientOverview, {
      width: '450px',
      data: {id: id}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.initForm();
    });
  }

  initForm() {
     this.createClientForm = this.fb.group({
      name: ['', Validators.required],
      address: [''],
      zipcode: [''],
      town: [''],
      country: ['France'],
      phone: [''],
      //email: ['', [Validators.required, Validators.email]],
      contacts: this.fb.array([
        this.fb.group({
          contactName: [''],
          contactFunction: [''],
          contactPhone: [''],
          contactCellPhone: [''],
          contactEmail: ['', [Validators.email]]})
      ]),
      comment: [''],
      rentalDiscount: ['0'],
      saleDiscount: ['0'],
      maintenance: ['false'],
      date: [new Date()]
    });
    this.createClientForm.valueChanges.subscribe(data => {
      console.log('Form changes', data);
    });
  }

}

@Component({
  selector: 'dialog-create-client-overview',
  templateUrl: 'dialog-create-client-overview.html',
})
export class DialogCreateClientOverview {
  constructor(
    public dialogRef: MatDialogRef<DialogCreateClientOverview>,
    @Inject(MAT_DIALOG_DATA) public data: DialogCreateClientData) {}
}



