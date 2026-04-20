import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RightSidePanelComponent } from './right-side-panel.component';
import { FilterPanelService } from '../../services/filterpanel.service';

describe('RightSidePanelComponent', () => {
  let component: RightSidePanelComponent;
  let fixture: ComponentFixture<RightSidePanelComponent>;
  let filterPanelService: FilterPanelService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RightSidePanelComponent],
      imports: [A11yModule, CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RightSidePanelComponent);
    component = fixture.componentInstance;
    filterPanelService = TestBed.inject(FilterPanelService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('focuses the heading and associates the description with it when opened', fakeAsync(() => {
    filterPanelService.changeFilterPanelState(true);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const heading = fixture.nativeElement.querySelector('h2') as HTMLHeadingElement;

    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute('aria-describedby')).toBe(component.panelDescriptionId);
    expect(dialog.hasAttribute('aria-describedby')).toBe(false);
  }));
});
