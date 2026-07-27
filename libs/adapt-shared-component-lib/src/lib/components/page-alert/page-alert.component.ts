import { Alert } from '@adapt/types';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'lib-adapt-page-alert',
  standalone: false,
  templateUrl: './page-alert.component.html',
  styleUrl: './page-alert.component.scss',
})
export class PageAlertComponent {
  @Input() alert?: Alert;
  @Input() headingLevel: 'h2' | 'h3' = 'h3';
}
