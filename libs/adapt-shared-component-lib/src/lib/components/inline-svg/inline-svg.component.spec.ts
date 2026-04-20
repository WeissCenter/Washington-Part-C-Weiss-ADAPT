import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { InlineSvgComponent } from './inline-svg.component';
import { InlineSvgService } from './inline-svg.service';

describe('InlineSvgComponent', () => {
  let component: InlineSvgComponent;
  let fixture: ComponentFixture<InlineSvgComponent>;
  let svgService: { getSvg: jest.Mock };

  const baseSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" /></svg>';

  beforeEach(async () => {
    svgService = {
      getSvg: jest.fn(),
    };
    svgService.getSvg.mockReturnValue(of(baseSvg));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: true,
        media: '',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    await TestBed.configureTestingModule({
      declarations: [InlineSvgComponent],
      providers: [{ provide: InlineSvgService, useValue: svgService }],
    }).compileComponents();

    fixture = TestBed.createComponent(InlineSvgComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders decorative SVGs as hidden from assistive technology', () => {
    component.src = 'assets/logo.svg';
    component.decorative = true;

    fixture.detectChanges();

    const wrapper = fixture.debugElement.query(By.css('span')).nativeElement as HTMLSpanElement;
    const svg = wrapper.querySelector('svg');

    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.hasAttribute('role')).toBe(false);
    expect(svg?.querySelector('title')).toBeNull();
    expect(wrapper.innerHTML).not.toContain('undefined');
  });

  it('injects an internal title and aria-labelledby for informative SVGs', () => {
    component.src = 'assets/logo.svg';
    component.alt = 'ADAPT logo';

    fixture.detectChanges();

    const wrapper = fixture.debugElement.query(By.css('span')).nativeElement as HTMLSpanElement;
    const svg = wrapper.querySelector('svg');
    const title = svg?.querySelector('title');

    expect(wrapper.hasAttribute('aria-hidden')).toBe(false);
    expect(svg?.getAttribute('role')).toBe('img');
    expect(title?.textContent).toBe('ADAPT logo');
    expect(svg?.getAttribute('aria-labelledby')).toBe(title?.id ?? null);
  });

  it('prefers label over alt for the generated SVG title', () => {
    component.src = 'assets/logo.svg';
    component.alt = 'Fallback logo';
    component.label = 'Primary logo';

    fixture.detectChanges();

    const svg = fixture.debugElement.query(By.css('span')).nativeElement.querySelector('svg') as SVGElement;
    const title = svg.querySelector('title');

    expect(title?.textContent).toBe('Primary logo');
  });

  it('warns when an informative SVG is missing alt text and does not emit empty naming markup', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    component.src = 'assets/logo.svg';

    fixture.detectChanges();

    const wrapper = fixture.debugElement.query(By.css('span')).nativeElement as HTMLSpanElement;
    const svg = wrapper.querySelector('svg');

    expect(warnSpy).toHaveBeenCalledWith('InlineSvgComponent: informative SVG "assets/logo.svg" is missing alt/label text.');
    expect(svg?.hasAttribute('aria-labelledby')).toBe(false);
    expect(svg?.hasAttribute('aria-label')).toBe(false);
    expect(svg?.querySelector('title')).toBeNull();
    expect(wrapper.innerHTML).not.toContain('undefined');
  });

  it('keeps media-hidden SVGs out of the accessibility tree', () => {
    (window.matchMedia as jest.Mock).mockReturnValue({
      matches: false,
      media: '(min-width: 64em)',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });

    component.src = 'assets/logo.svg';
    component.alt = 'ADAPT logo';
    component.media = '(min-width: 64em)';

    fixture.detectChanges();

    const wrapper = fixture.debugElement.query(By.css('span')).nativeElement as HTMLSpanElement;

    expect(svgService.getSvg).not.toHaveBeenCalled();
    expect(component.hidden).toBe(true);
    expect(wrapper.hidden).toBe(true);
    expect(wrapper.textContent?.trim()).toBe('');
  });
});
