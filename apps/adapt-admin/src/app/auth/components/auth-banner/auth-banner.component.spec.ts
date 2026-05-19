import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AuthBannerComponent } from './auth-banner.component';

describe('AuthBannerComponent', () => {
  let component: AuthBannerComponent;
  let fixture: ComponentFixture<AuthBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AuthBannerComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders PNG logos as images instead of inline SVGs', () => {
    component.logo = 'assets/shared/logos/states/ne/state-hero-logo.png';

    fixture.detectChanges();

    const image = fixture.debugElement.query(By.css('img.logo'));
    const inlineSvg = fixture.debugElement.query(By.css('lib-adapt-inline-svg'));

    expect(image).toBeTruthy();
    expect(image.nativeElement.getAttribute('src')).toBe('assets/shared/logos/states/ne/state-hero-logo.png');
    expect(inlineSvg).toBeNull();
  });
});
