import { Component, OnInit, Inject } from '@angular/core';
import { Client } from '../client';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { FormBuilder, FormArray } from '@angular/forms';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {ClientFormManager} from "../../forms/clientFormManager";
import {Router} from "@angular/router";

export interface DialogCreateClientData {
  id: string;
}

@Component({
  selector: 'app-create-client',
  templateUrl: './createClient.component.html',
  styleUrls: ['./createClient.component.less']
})

export class CreateClientComponent implements OnInit {

  public createClientForm;

  private clientsCollection: AngularFirestoreCollection<Client>;

  private clientFormManager : ClientFormManager;

  constructor(private router: Router, db: AngularFirestore, private fb: FormBuilder, private dialog: MatDialog) {
    this.clientsCollection = db.collection('clients');
    this.clientFormManager = new ClientFormManager();
  }

  ngOnInit() {
    this.initForm();
  }

  addClient() {
    this.clientsCollection.add(this.createClientForm.value).then(data => {
      //console.log("Document written with ID: ", data.id);
      this.openDialog(data.id)});
  }


  get contacts() {
    return this.createClientForm.get('contacts') as FormArray;
  }

  addContacts() {
    this.contacts.push(this.clientFormManager.contactForm());
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

    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['detail-client/' + id]).then();
    });
  }

  initForm() {
    this.createClientForm = this.clientFormManager.getForm();
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
