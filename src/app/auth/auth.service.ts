import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { from } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase/app';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(public afAuth: AngularFireAuth) { }

  isLoggedIn = false;

  // todo récupérer les user dans la BD pour ne pas qu'ils apparaissent dans le code source et compromettent la sécurité.
  authorizedUser = ["jerome.lions@ovh.fr", "laurent.mannarelli@gmail.com", "francisdony94@gmail.com", "marina.bourdon025@gmail.com", "didier.borneconcept@gmail.com"];

  // store the URL so we can redirect after logging in
  redirectUrl: string = "home";

  login():Promise<any> {
    return this.afAuth.auth.signInWithPopup(new auth.GoogleAuthProvider())
  }

   loginConfirm(): Observable<boolean> {
    return of(true).pipe(tap(val => {
     //console.log("tap");
     this.isLoggedIn = true;
    }
    ));
   }

  logout(): void {
    this.afAuth.auth.signOut();
    this.isLoggedIn = false;
  }
}

