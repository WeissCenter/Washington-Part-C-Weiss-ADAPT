import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SidePanelComponent } from './side-panel.component';

describe('SidePanelComponent', () => {
  let component: SidePanelComponent;
  let fixture: ComponentFixture<SidePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SidePanelComponent],
      imports: [A11yModule, CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SidePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('focuses the heading and associates the description with it by default when opened', fakeAsync(() => {
    component.open();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const heading = fixture.nativeElement.querySelector('h2') as HTMLHeadingElement;

    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute('aria-describedby')).toBe('adaptSidePanelDescription');
  }));
});
