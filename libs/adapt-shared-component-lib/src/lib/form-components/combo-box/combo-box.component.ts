import {
  afterNextRender,
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  PLATFORM_ID,
  QueryList,
  Self,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl, Validators } from '@angular/forms';
let comboBox: any;

@Component({
  selector: 'lib-adapt-combo-box',
  standalone: false,
  templateUrl: './combo-box.component.html',
  styleUrls: ['./combo-box.component.scss'],
})
export class ComboBoxComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @ViewChild('comboBoxContainer') comboBoxContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('parent') parent?: ElementRef<HTMLDivElement>;

  @ViewChildren('options') options?: QueryList<HTMLOptionElement>;

  @Input() readonly = false;

  @Input() comboID = '';
  @Input() delayedSet = false;
  @Input() label = '';
  @Input() hint = '';
  @Input() disableClear = false;

  @Input() placeholder = '';

  @Input() items: any = [];

  @Input() itemAccessor?: string;
  @Input() itemLabel = 'name';
  @Input() itemLocalizedLabel?: string;

  @Input() compareID?: string;

  @Input() labelStyle?: Record<string, string>;

  @Input() comboBoxStyle?: Record<string, string>;

  onChange = (value: any) => {
    return null;
  };

  onTouched = () => {
    return null;
  };

  touched = false;

  disabled = false;

  public value: any;

  public compareFunc = this.compareByID.bind(this);

  constructor(@Inject(PLATFORM_ID) platform: string, @Self() @Optional() private parentControl?: NgControl) {
    if (this.parentControl) {
      this.parentControl.valueAccessor = this;
    }

    afterNextRender(() => {
      import('@uswds/uswds/js').then((lib) => {
        comboBox = lib.comboBox

        if (this.options) {
          this.options.changes.subscribe(() => this.writeValue(this.value));
        }

        if (this.comboBoxContainer && comboBox) {
          comboBox.init(this.comboBoxContainer.nativeElement);

          if (this.disabled || this.readonly) {
            comboBox.disable(this.parent!.nativeElement);
          }

          if (this.disableClear)
            this.comboBoxContainer.nativeElement
              .getElementsByClassName('usa-combo-box__clear-input__wrapper')
              .item(0)
              ?.setAttribute('hidden', 'true');

          this.parent?.nativeElement.addEventListener('focusout', (event) => {
            if (!event.isTrusted) return;

            this.markAsTouched();
          });
        }
      });
    })

  }

  compareByID(itemOne: any, itemTwo: any) {
    if (!this.compareID) {
      return itemOne && itemTwo && itemOne == itemTwo;
    }

    return itemOne && itemTwo && itemOne[this.compareID] == itemTwo[this.compareID];
  }

  ngAfterViewInit(): void {

    // import('@uswds/uswds/js').then((lib) => {
    //   comboBox = lib.comboBox

    //   if (this.options) {
    //     this.options.changes.subscribe(() => this.writeValue(this.value));
    //   }

    //   if (this.comboBoxContainer && comboBox) {
    //     comboBox.init(this.comboBoxContainer.nativeElement);

    //     if (this.disabled || this.readonly) {
    //       comboBox.disable(this.parent!.nativeElement);
    //     }

    //     if (this.disableClear)
    //       this.comboBoxContainer.nativeElement
    //         .getElementsByClassName('usa-combo-box__clear-input__wrapper')
    //         .item(0)
    //         ?.setAttribute('hidden', 'true');

    //     this.parent?.nativeElement.addEventListener('focusout', (event) => {
    //       if (!event.isTrusted) return;

    //       this.markAsTouched();
    //     });
    //   }
    // })


  }

  ngOnDestroy(): void {
    if (this.comboBoxContainer && comboBox) {
      comboBox.off(this.comboBoxContainer.nativeElement);
    }
  }

  markAsTouched() {
    if (!this.touched) {
      this.onTouched();
      this.touched = true;
    }
  }

  writeValue(obj: any): void {

    setTimeout(() => {

      if(this.delayedSet)   this.value = obj;

      if (this.parent && comboBox) {
        const { comboBoxEl } = comboBox.getComboBoxContext(this.parent.nativeElement);

        const event = new CustomEvent('focusout', { bubbles: true, cancelable: true });

        comboBoxEl.dispatchEvent(event);
        this.updateDisabledState();

      }
    }, 100);

    if(!this.delayedSet)  this.value = obj;



  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  private updateDisabledState() {
    try {
      if (this.parent && this.parent.nativeElement) {
        this.disabled ? comboBox.disable(this.parent.nativeElement) : comboBox.enable(this.parent.nativeElement);
      }
    } catch (err) {
      console.error('failed to set uswds combobox disable state');
    }
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;

    if (this.parent && this.parent.nativeElement) {
      this.disabled ? comboBox.disable(this.parent.nativeElement) : comboBox.enable(this.parent.nativeElement);
    }
  }

  public get required() {
    return Boolean(this.parentControl?.control?.hasValidator(Validators.required));
  }
}
