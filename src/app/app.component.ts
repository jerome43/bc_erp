import {Component, Injectable} from '@angular/core';
import { AuthService } from './auth/auth.service';

export enum UserRights {
  admin = 'admin',
  editor = 'editor',
  consult = 'consult'
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})

@Injectable({
  providedIn: 'root'
})

export class AppComponent {

  message: string;
  user;
  authorized:boolean;
  rights: "admin" | "editor" | "consult" = UserRights.editor;

  constructor(public authService: AuthService) {
    this.authorized=false;
  }

  login() {
    this.message = 'Tentative de connexion ...';
    this.authService.login().then(data=> {
      //console.log (data);
      this.user = data.user;
      const authorizedUser = this.authService.authorizedUser;
      if (authorizedUser.includes(data.user.email)) {
        this.authService.loginConfirm().subscribe(()=> {
          this.authorized=true;
          const adminUsers = this.authService.adminUsers;
          if (adminUsers.includes(data.user.email)) {
            this.rights = UserRights.admin;
          }
        })
      }
      else {
        this.message = 'Votre émail n\'est pas valide.';
      }
    });
  }

  authorizedEventEmitter() {
    console.log("authorizedEventEmitter receive");
    this.authorized=false;
  }
}
