import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InPageNavigationComponent } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/components/in-page-navigation/in-page-navigation.component';

const initMock = jest.fn();

jest.mock('@uswds/uswds/js', () => ({
  inPageNavigation: {
    init: (...args: unknown[]) => initMock(...args),
  },
}));

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

@Component({
  template: `
    <section class="settings-content display-flex">
      <adapt-in-page-navigation
        selector=".settings-content-body"
        headingElements="h3"
        headingLevel="h2"
        titleText="Jump To:">
      </adapt-in-page-navigation>

      <div class="settings-content-body">
        @if (showHeading) {
          <h3 id="security">Security</h3>
        }

        @if (showDescription) {
          <p>Manage session settings.</p>
        }
      </div>
    </section>
  `,
  standalone: false,
})
class SettingsNavigationHostComponent {
  showHeading = false;
  showDescription = false;
}

describe('Settings navigation integration', () => {
  let fixture: ComponentFixture<SettingsNavigationHostComponent>;
  let host: SettingsNavigationHostComponent;
  let originalMutationObserver: typeof MutationObserver;

  beforeEach(async () => {
    initMock.mockClear();
    MockMutationObserver.instances = [];
    originalMutationObserver = globalThis.MutationObserver;
    globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;

    await TestBed.configureTestingModule({
      declarations: [InPageNavigationComponent, SettingsNavigationHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsNavigationHostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => {
    globalThis.MutationObserver = originalMutationObserver;
  });

  it('initializes the shared in-page nav after settings headings render later', async () => {
    fixture.detectChanges();
    expect(initMock).not.toHaveBeenCalled();

    host.showHeading = true;
    host.showDescription = true;
    fixture.detectChanges();
    MockMutationObserver.instances[0]?.trigger();
    await fixture.whenStable();

    expect(initMock).toHaveBeenCalledTimes(1);
  });
});
