import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { DataRepComparisonControlsComponent } from './data-rep-comparison-controls.component';

@Component({
  selector: 'lib-data-rep-comparison-trigger',
  standalone: false,
  template: `
    @if (controlPanel) {
      <button #button [id]="id" [attr.aria-controls]="controlPanel.id" [attr.aria-expanded]="controlPanel.isOpen" class="usa-button flex-column usa-button--outline shadow-none width-auto align-self-start" type="button" [ngClass]="{'bg-primary text-white hover:text-white hover:bg-primary-dark': controlPanel.isOpen}" (click)="controlPanel.toggleControls()">
        <span class="fa-columns fal" role="img" aria-hidden="true" alt=""></span>
        {{content}}
      </button>
    }
    `,
  styleUrl: './data-rep-comparison-trigger.component.scss',
})
export class DataRepComparisonTriggerComponent {
  @Input() public content = 'Compare';
  @Input() public controlPanel!: DataRepComparisonControlsComponent|null;
  @Input() public id = 'data-rep-comparison-trigger-' + crypto.randomUUID();

  @ViewChild('button') public buttonElement!: ElementRef<HTMLButtonElement>;


}
