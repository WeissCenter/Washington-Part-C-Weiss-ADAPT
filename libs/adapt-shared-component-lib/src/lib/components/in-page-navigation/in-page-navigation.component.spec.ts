import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InPageNavigationComponent } from './in-page-navigation.component';

const initMock = jest.fn();

jest.mock('@uswds/uswds/js', () => ({
  inPageNavigation: {
    init: (...args: unknown[]) => initMock(...args),
  },
}));

@Component({
  template: `
    <adapt-in-page-navigation
      selector=".settings-content-body"
      headingElements="h3">
    </adapt-in-page-navigation>

    @if (showContainer) {
      <div class="settings-content-body">
        @if (showHeading) {
          <h3 id="security">Security</h3>
        }

        @if (showBodyCopy) {
          <p>Updated body copy</p>
        }
      </div>
    }
  `,
  standalone: false,
})
class TestHostComponent {
  showContainer = true;
  showHeading = false;
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

describe('InPageNavigationComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let originalMutationObserver: typeof MutationObserver;

  beforeEach(async () => {
    initMock.mockClear();
    MockMutationObserver.instances = [];
    originalMutationObserver = globalThis.MutationObserver;
    globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;

    await TestBed.configureTestingModule({
      declarations: [InPageNavigationComponent, TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => {
    globalThis.MutationObserver = originalMutationObserver;
  });

  it('does not initialize before matching headings exist', () => {
    fixture.detectChanges();

    expect(initMock).not.toHaveBeenCalled();
  });

  it('initializes after the target container appears later', async () => {
    host.showContainer = false;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(initMock).not.toHaveBeenCalled();

    host.showContainer = true;
    host.showHeading = true;
    fixture.detectChanges();
    MockMutationObserver.instances[0]?.trigger();
    await fixture.whenStable();

    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it('initializes after matching headings are rendered later', async () => {
    fixture.detectChanges();

    host.showHeading = true;
    fixture.detectChanges();
    MockMutationObserver.instances[0]?.trigger();
    await fixture.whenStable();

    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it('does not re-initialize when unrelated DOM changes occur', async () => {
    host.showHeading = true;
    fixture.detectChanges();
    MockMutationObserver.instances[0]?.trigger();
    await fixture.whenStable();

    initMock.mockClear();

    host.showBodyCopy = true;
    fixture.detectChanges();
    MockMutationObserver.instances[0]?.trigger();
    await fixture.whenStable();

    expect(initMock).not.toHaveBeenCalled();
  });

  it('disconnects the observer on destroy', () => {
    fixture.detectChanges();

    const observer = MockMutationObserver.instances[0];
    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
  });
});
