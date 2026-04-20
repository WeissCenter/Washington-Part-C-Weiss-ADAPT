import { AfterViewChecked, Component, ElementRef, HostListener, Input, OnDestroy, ViewChild } from '@angular/core';
import { FilterPanelService } from '../../services/filterpanel.service';
import { Subscription } from 'rxjs';
import { focusElement } from '../../util/focus-management.util';

@Component({
  selector: 'adapt-right-side-panel',
  standalone: false,
  templateUrl: './right-side-panel.component.html',
  styleUrls: ['./right-side-panel.component.scss'],
})
export class RightSidePanelComponent implements AfterViewChecked, OnDestroy {
  private subscription: Subscription;
  private pendingInitialFocus = false;

  // @Input() show = false;
  public show = false;
  @ViewChild('filterPanel') panel!: ElementRef;
  @ViewChild('panelHeading') panelHeading!: ElementRef<HTMLHeadingElement>;

  @Input() title = 'Filter';
  @Input() description = 'Make your filtering selections and hit apply.';
  @Input() close = 'Close';
  @Input() location = 'right';
  panelTitleId = `filter-panel-title-${this.createUniqueId()}`;
  panelDescriptionId = `filter-panel-description-${this.createUniqueId()}`;

  constructor(private filterPanelService: FilterPanelService) {
    this.subscription = this.filterPanelService.currentFilterPanelState.subscribe((state) => {
      this.show = state;
      if (state) {
        this.pendingInitialFocus = true;
        setTimeout(() => this.focusPanelHeading(), 0);
      }
    });
  }

  ngAfterViewChecked() {
    if (this.show && this.pendingInitialFocus) {
      this.focusPanelHeading();
    }
  }

  // Close panel when user hits escape key
  @HostListener('keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.show && event.key === 'Escape') {
      this.toggleFilterPanel();
    }
  }

  toggleFilterPanel() {
    this.show = false;
    this.filterPanelService.changeFilterPanelState(false);
  }

  private focusPanelHeading() {
    const heading = this.panelHeading?.nativeElement;

    if (!this.show || !heading) {
      return;
    }

    this.pendingInitialFocus = false;
    focusElement(heading, { preventScroll: true, removeTabindexOnBlur: false });
  }

  private createUniqueId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return Math.random().toString(36).slice(2);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
