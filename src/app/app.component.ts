import { Component} from '@angular/core';
import { AuthService } from './auth/auth.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {

  message: string;
  user;
  authorized:boolean;

  constructor(public authService: AuthService) {
    this.authorized=false;
  }


  login() {
    this.message = 'Tentative de connexion ...';
    this.authService.login().then(data=> {
      console.log (data);
      this.user = data.user;
      const authorizedUser = this.authService.authorizedUser;
      if (authorizedUser.includes(data.user.email)) {
        this.authService.loginConfirm().subscribe(()=> {
          this.authorized=true;
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
