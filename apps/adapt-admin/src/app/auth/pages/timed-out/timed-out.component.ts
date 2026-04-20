
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminModule } from '../../../admin/admin.module';
import { ComponentsModule } from '../../../components/components.module';
import { AuthModule } from '../../auth.module';

@Component({
  selector: 'adapt-timed-out',
  standalone: false,
  templateUrl: './timed-out.component.html',
  styleUrl: './timed-out.component.scss',
})
export class TimedOutComponent {
  public sessionExpiry = parseInt(localStorage.getItem('session_expiry') || '-1');

  public get sinceExpiry() {
    const now = Math.floor(Date.now() / 1000); // Get current time in seconds
    const secondsPassed = now - this.sessionExpiry / 1000;

    const minutes = Math.floor(secondsPassed / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 20) {
      return 'over 20 hours';
    } else if (hours >= 1) {
      return `${hours} hours`;
    } else if (minutes > 0) {
      return `${minutes} minutes`;
    } else {
      return `less than a minute`;
    }
  }
}
