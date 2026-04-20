import { AfterViewInit, Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ComponentsModule } from './components/components.module';
import { UserService } from './auth/services/user/user.service';
import { WeissAccessibilityCenterModule } from 'weiss-accessibility-center';
@Component({
  standalone: true,
  imports: [RouterModule, ComponentsModule, WeissAccessibilityCenterModule],
  selector: 'adapt-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'adapt-admin';

  constructor(
    private user: UserService,
  ) {}

  ngOnInit(): void {
    this.user.initUserSession();
  }

  ngAfterViewInit(): void {
    require('@uswds/uswds');
  }
}
