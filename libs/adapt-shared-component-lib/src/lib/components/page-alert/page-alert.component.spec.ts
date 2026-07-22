import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageAlertComponent } from './page-alert.component';

describe('PageAlertComponent', () => {
  let component: PageAlertComponent;
  let fixture: ComponentFixture<PageAlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PageAlertComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the alert heading as an h3 by default', () => {
    component.alert = { type: 'warning', title: 'Warning heading', body: 'Warning body' };
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h3')?.textContent).toContain('Warning heading');
  });

  it('can render the alert heading as an h2', () => {
    component.alert = { type: 'warning', title: 'Privacy heading', body: 'Privacy body' };
    (component as unknown as { headingLevel: string }).headingLevel = 'h2';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Privacy heading');
    expect(fixture.nativeElement.querySelector('h3')).toBeNull();
  });
});
