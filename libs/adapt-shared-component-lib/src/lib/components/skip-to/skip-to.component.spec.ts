import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { SkipToComponent } from './skip-to.component';

@Component({
  template: `
    <adapt-skip-to [rebuildStrategy]="rebuildStrategy"></adapt-skip-to>

    <main>
      @if (showHeading) {
        <h2 id="first-heading">First heading</h2>
      }

      @if (showSecondHeading) {
        <h2 id="second-heading">Second heading</h2>
      }

      @if (showBodyCopy) {
        <p>Body copy</p>
      }

      <button id="focus-target">Focusable target</button>
    </main>
  `,
  standalone: false,
})
class TestHostComponent {
  rebuildStrategy: 'auto' | 'always' = 'auto';
  showHeading = true;
  showSecondHeading = false;
  showBodyCopy = false;
}

class MockMutationObserver {
  static instances: MockMutationObserver[] = [];

  observe = jest.fn();
  disconnect = jest.fn();

  constructor(private callback: MutationCallback) {
    MockMutationObserver.instances.push(this);
  }

  trigger() {
    this.callback([], this as unknown as MutationObserver);
  }
}

class RouterStub {
  readonly events = new Subject<unknown>();
}

describe('SkipToComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let routerStub: RouterStub;
  let originalMutationObserver: typeof MutationObserver;
  let skipToInitMock: jest.Mock;

  beforeEach(async () => {
    skipToInitMock = jest.fn();
    (window as Window & { SkipTo?: { init: jest.Mock } }).SkipTo = { init: skipToInitMock };

    routerStub = new RouterStub();

    MockMutationObserver.instances = [];
    originalMutationObserver = globalThis.MutationObserver;
    globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;

    await TestBed.configureTestingModule({
      declarations: [SkipToComponent, TestHostComponent],
      providers: [{ provide: Router, useValue: routerStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => {
    globalThis.MutationObserver = originalMutationObserver;
    delete (window as Window & { SkipTo?: { init: jest.Mock } }).SkipTo;
    document.querySelectorAll('.skip-to').forEach((node) => node.remove());
    document.getElementById('id-skip-to-js-4')?.remove();
  });

  it('initializes once in browser', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(skipToInitMock).toHaveBeenCalledTimes(1);
  });

  it('focuses skip-to button on initial load', async () => {
    skipToInitMock.mockImplementation(() => {
      const button = document.createElement('button');
      const wrapper = document.createElement('div');
      wrapper.className = 'skip-to';
      wrapper.appendChild(button);
      document.body.appendChild(wrapper);
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const skipToButton = document.querySelector('.skip-to button') as HTMLButtonElement;
    expect(document.activeElement).toBe(skipToButton);
  });

  it('skips rebuild when signature is unchanged', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    skipToInitMock.mockClear();

    host.showBodyCopy = true;
    fixture.detectChanges();
    MockMutationObserver.instances[0]?.trigger();
    await fixture.whenStable();

    expect(skipToInitMock).not.toHaveBeenCalled();
  });

  it('rebuilds when headings change', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    skipToInitMock.mockClear();

    host.showSecondHeading = true;
    fixture.detectChanges();
    MockMutationObserver.instances[0]?.trigger();
    await fixture.whenStable();

    expect(skipToInitMock).toHaveBeenCalledTimes(1);
  });

  it('restores focus if rebuild moves it to skip-to button', async () => {
    skipToInitMock.mockImplementation(() => {
      const button = document.createElement('button');
      const wrapper = document.createElement('div');
      wrapper.className = 'skip-to';
      wrapper.appendChild(button);
      document.body.appendChild(wrapper);
      button.focus();
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const focusTarget = document.getElementById('focus-target') as HTMLButtonElement;
    focusTarget.focus();

    host.showSecondHeading = true;
    fixture.detectChanges();
    MockMutationObserver.instances[0]?.trigger();
    await fixture.whenStable();

    expect(document.activeElement).toBe(focusTarget);
  });

  it('does not override Shift+Tab intent when focus lands on skip-to', async () => {
    skipToInitMock.mockImplementation(() => {
      const button = document.createElement('button');
      const wrapper = document.createElement('div');
      wrapper.className = 'skip-to';
      wrapper.appendChild(button);
      document.body.appendChild(wrapper);
      button.focus();
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    document.dispatchEvent(tabEvent);

    host.showSecondHeading = true;
    fixture.detectChanges();
    MockMutationObserver.instances[0]?.trigger();
    await fixture.whenStable();

    const skipToButton = document.querySelector('.skip-to button') as HTMLButtonElement;
    expect(document.activeElement).toBe(skipToButton);
  });



  it('skips initialization on server platform', async () => {
    delete (window as Window & { SkipTo?: { init: jest.Mock } }).SkipTo;

    await TestBed.resetTestingModule()
      .configureTestingModule({
        declarations: [SkipToComponent, TestHostComponent],
        providers: [
          { provide: Router, useValue: routerStub },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      })
      .compileComponents();

    const serverFixture = TestBed.createComponent(TestHostComponent);
    serverFixture.detectChanges();
    await serverFixture.whenStable();

    expect(skipToInitMock).not.toHaveBeenCalled();
  });

  it('rebuilds on navigation changes', async () => {
    host.rebuildStrategy = 'always';
    fixture.detectChanges();
    await fixture.whenStable();

    skipToInitMock.mockClear();

    routerStub.events.next(new NavigationEnd(1, '/resources?navigation=foo', '/resources?navigation=foo'));
    await fixture.whenStable();

    expect(skipToInitMock).toHaveBeenCalledTimes(1);
  });
});
