import { Component, OnInit, Output, Input, EventEmitter} from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.less']
})
export class HeaderComponent implements OnInit {

  @Input() user; // pour recevoir l'user du template parent
  @Output() authorizedEventEmitter = new EventEmitter(); // pour envoyer des infos aux templates parents
  @Output() public sidenavToggle = new EventEmitter();
  title = 'ERP BORNE CONCEPT';

  constructor(public authService: AuthService) { }

  ngOnInit() {
  }

  public onToggleSidenav = () => {
    this.sidenavToggle.emit();
  };

  logout() {
    console.log('logout');
    this.authService.logout();
    this.authorizedEventEmitter.emit();
  }

}
