import {
  Component,
  Input,
  TemplateRef,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';

@Component({
  selector: 'adapt-opt-out-modal',
  standalone: false,
  templateUrl: './opt-out-modal.component.html',
  styleUrls: ['./opt-out-modal.component.scss'],
})
export class OptOutModalComponent {
  @Input() title = '';
  @Input() large = false;
  @Input() contentTemplate: TemplateRef<any> | null = null;
  @Input() textContent: string | null = null;
  @Input() triggerId: string | null = null;
  @Output() doNotShowAgain = new EventEmitter<string>();
  @Output() closeEvent = new EventEmitter<void>();

  @ViewChild('exit') closeButton!: ElementRef;

  isVisible = false;
  doNotShow = false;

  open() {
    this.isVisible = true;
  }

  close() {
    if (this.doNotShow && this.triggerId) {
      this.doNotShowAgain.emit(this.triggerId);
    }
    this.closeEvent.emit();
  }

  ngAfterViewInit() {
    if (this.closeButton) {
      this.closeButton.nativeElement.focus();
    }
  }

  @HostListener('document:keydown.escape')
  onKeydownHandler() {
    this.close();
  }
}
