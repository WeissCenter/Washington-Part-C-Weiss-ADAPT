import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
import { Component, EventEmitter, ViewChild } from '@angular/core';
import { AdaptDataService } from 'apps/adapt-admin/src/app/services/adapt-data.service';
import { ConfirmModalComponent } from 'libs/adapt-shared-component-lib/src/lib/components/confirm-modal/confirm-modal.component';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Component({
  selector: 'adapt-user-settings',
  standalone: false,
  templateUrl: './user-settings.component.html',
  styleUrl: './user-settings.component.scss',
})
export class UserSettingsComponent {
  public _users = new BehaviorSubject([]);
  public $users = this._users.asObservable();
  @ViewChild(ConfirmModalComponent) userEditConfirmModal!: ConfirmModalComponent;

  public confirmEdit = new Subject<boolean>();

  readonly $page = this.content.getPageContentSignal('user-management');

  constructor(private api: AdaptDataService, public content: PagesContentService) {
    this.api.getUsers().subscribe((users) => this._users.next(users));
  }
}
