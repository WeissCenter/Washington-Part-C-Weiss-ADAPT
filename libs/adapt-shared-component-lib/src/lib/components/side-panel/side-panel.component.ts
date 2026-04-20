import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { focusElement } from '../../util/focus-management.util';

@Component({
  selector: 'lib-adapt-side-panel',
  standalone: false,
  templateUrl: './side-panel.component.html',
  styleUrl: './side-panel.component.scss',
})
export class SidePanelComponent {

  public show = false;
  @ViewChild('sidePanel') panel!: ElementRef;
  @ViewChild('panelHeading') panelHeading?: ElementRef<HTMLHeadingElement>;
  @ViewChild(CdkTrapFocus) trap?: CdkTrapFocus;
  private opener: HTMLElement | null = null;

  @Input() title = 'Adapt Side Panel';
  @Input() description = 'Enter some descriptive content here.';
  @Input() selectorClose = 'Close';

  @Input() direction : 'right' | 'left' = 'right'
  @Input() initialFocusId?: string;

  @Output() statusChange = new EventEmitter<boolean>();

  close() {
    this.show = false;
    this.statusChange.emit(false);
    if (this.opener) {
      this.opener.focus();
      this.opener = null;
    }
  }

  open(){
    const active = document.activeElement;
    this.opener = active instanceof HTMLElement ? active : null;

    this.show = true;
    this.statusChange.emit(true);

    // After panel is shown, set initial focus
    setTimeout(() => {
      if (!this.panel) return;
      if (this.initialFocusId) {
        const el = this.panel.nativeElement.querySelector(`#${this.initialFocusId}`) as HTMLElement | null;
        if (el) {
          el.focus();
          return;
        }
      }
      focusElement(this.panelHeading?.nativeElement ?? null, { preventScroll: true, removeTabindexOnBlur: false });
    });
  }

  // Close panel when user hits escape key
  @HostListener('keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.show && event.key === 'Escape') {
      this.close();
    }
  }


}
