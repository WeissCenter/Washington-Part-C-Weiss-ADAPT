import {
  AfterViewInit,
  Component,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

interface SkipToSettings {
  attachElement: string;
  landmarks: string;
  headings: string;
  containerRole: string;
  fontFamily: string;
  fontSize: string;
  buttonLabel: string;
  menuTextColor: string;
  buttonBackgroundColor: string;
  menuitemFocusTextColor: string;
  focusBorderColor: string;
  menuBackgroundColor: string;
  menuitemFocusBackgroundColor: string;
  displayOption: string;
  positionLeft: string;
  accesskey: string;
}

type RebuildStrategy = 'auto' | 'always';

type SkipToApi = {
  init: (config?: unknown) => void;
};

type SkipToWindow = Window & {
  SkipTo?: SkipToApi;
  SkipToConfig?: unknown;
};

const SKIP_TO_LOCAL_SCRIPT_SRC = '/assets/shared/js/skipto.min.js';
const SKIP_TO_CDN_SCRIPT_SRC = 'https://paypal.github.io/skipto/downloads/js/skipto.min.js';
const SKIP_TO_STYLE_ID = 'id-skip-to-js-4';

@Component({
  selector: 'adapt-skip-to',
  standalone: false,
  template: '',
})
export class SkipToComponent implements AfterViewInit, OnDestroy {
  @Input() rebuildStrategy: RebuildStrategy = 'auto';
  @Input() focusOnInitialLoad = true;

  @Input() attachElement = 'body';
  @Input() landmarks =
    '[role=alert],[role=main],main,[role=banner],header,nav,[role=navigation],section,[role=region],[role=search],aside,[role=complementary],footer,[role=contentinfo]';
  @Input() headings = 'h1, h2, h3';
  @Input() containerRole = 'navigation';
  @Input() fontFamily = 'var(--usa-font-body)';
  @Input() fontSize = 'var(--usa-font-size-2xs)';
  @Input() buttonLabel = 'Skip to a section';
  @Input() menuTextColor = 'var(--usa-color-global-white)';
  @Input() buttonBackgroundColor = 'var(--usa-color-global-black)';
  @Input() menuitemFocusTextColor = 'var(--usa-color-global-black)';
  @Input() focusBorderColor = 'var(--usa-color-magenta-vivid-50)';
  @Input() menuBackgroundColor = 'var(--usa-color-global-black)';
  @Input() menuitemFocusBackgroundColor = 'var(--usa-color-global-white)';
  @Input() displayOption = 'popup';
  @Input() positionLeft = '0';
  @Input() accesskey = '0';

  private static scriptLoadPromise: Promise<void> | null = null;

  private lastSignature = '';
  private observer?: MutationObserver;
  private observedNode?: Node;
  private routerSub?: Subscription;
  private syncQueued = false;
  private hasInitialized = false;
  private lastTabKeydownAt = 0;

  private readonly keydownListener = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      this.lastTabKeydownAt = Date.now();
    }
  };

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router,
    private ngZone: NgZone
  ) {}

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      await this.ensureSkipToApi();
    } catch (error) {
      console.error('SkipTo script failed to load.', error);
      return;
    }
    this.document.addEventListener('keydown', this.keydownListener, true);
    this.observeTarget();
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.queueSync();
      }
    });
    this.queueSync();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.observer?.disconnect();
    this.document.removeEventListener('keydown', this.keydownListener, true);
  }

  private async ensureSkipToApi(): Promise<void> {
    if (this.getSkipToApi()) {
      return;
    }

    this.setGlobalSkipToConfig();

    if (!SkipToComponent.scriptLoadPromise) {
      SkipToComponent.scriptLoadPromise = this.loadScript(SKIP_TO_LOCAL_SCRIPT_SRC).catch((localError) => {
        console.warn('SkipTo local script load failed, falling back to CDN.', localError);
        this.setGlobalSkipToConfig();
        return this.loadScript(SKIP_TO_CDN_SCRIPT_SRC);
      });
    }

    await SkipToComponent.scriptLoadPromise;

    if (!this.getSkipToApi()) {
      throw new Error('SkipTo API not found on window after script load.');
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      this.document.body.appendChild(script);
    });
  }

  private getSkipToApi(): SkipToApi | undefined {
    return (this.document.defaultView as SkipToWindow | null)?.SkipTo;
  }

  private setGlobalSkipToConfig(): void {
    const win = this.document.defaultView as SkipToWindow | null;
    if (!win) {
      return;
    }

    win.SkipToConfig = { settings: { skipTo: this.getSkipToSettings() } };
  }

  private observeTarget(): void {
    const nextObservedNode = this.getObservedNode();

    if (!nextObservedNode || this.observedNode === nextObservedNode) {
      return;
    }

    this.observer?.disconnect();
    this.observedNode = nextObservedNode;

    this.ngZone.runOutsideAngular(() => {
      this.observer = new MutationObserver(() => this.queueSync());
      this.observer.observe(nextObservedNode, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['id', 'aria-label', 'aria-labelledby', 'role', 'title'],
      });
    });
  }

  private queueSync(): void {
    if (this.syncQueued) {
      return;
    }

    this.syncQueued = true;
    this.ngZone.runOutsideAngular(() => {
      queueMicrotask(() => {
        this.syncQueued = false;
        this.ngZone.run(() => this.syncSkipTo());
      });
    });
  }

  private syncSkipTo(): void {
    this.observeTarget();

    const nextSignature = this.buildSignature();
    if (this.rebuildStrategy === 'auto' && this.hasInitialized && nextSignature === this.lastSignature) {
      return;
    }

    const isInitialSync = !this.hasInitialized;
    this.lastSignature = nextSignature;
    this.rebuildPreservingFocus(isInitialSync);
    this.hasInitialized = true;
  }

  private buildSignature(): string {
    const root = this.getAttachElement();
    if (!root) {
      return '';
    }

    const signatureParts: string[] = [];
    const landmarks = Array.from(root.querySelectorAll<HTMLElement>(this.landmarks));
    const headings = Array.from(root.querySelectorAll<HTMLElement>(this.headings));

    for (const element of landmarks) {
      if (this.isSkipToElement(element) || !this.isVisible(element)) {
        continue;
      }

      signatureParts.push(
        `L:${element.tagName}:${element.id}:${element.getAttribute('role') ?? ''}:${
          element.getAttribute('aria-label') ?? ''
        }`
      );
    }

    for (const element of headings) {
      if (this.isSkipToElement(element) || !this.isVisible(element)) {
        continue;
      }

      signatureParts.push(`H:${element.tagName}:${element.id}:${(element.textContent ?? '').trim()}`);
    }

    return signatureParts.join('|');
  }

  private rebuildPreservingFocus(isInitialSync: boolean): void {
    const activeBefore = this.document.activeElement as HTMLElement | null;

    this.teardownSkipTo();

    const skipTo = this.getSkipToApi();
    if (!skipTo) {
      return;
    }

    skipTo.init({ settings: { skipTo: this.getSkipToSettings() } });

    const activeAfter = this.document.activeElement as HTMLElement | null;
    const skipToButton = this.getSkipToButton();

    if (
      isInitialSync &&
      this.focusOnInitialLoad &&
      skipToButton &&
      this.isDocumentLevelElement(activeBefore)
    ) {
      skipToButton.focus({ preventScroll: true });
      return;
    }

    if (!activeBefore || !activeBefore.isConnected) {
      return;
    }

    if (this.isSkipToButton(activeAfter) && activeBefore !== activeAfter) {
      if (this.wasRecentTabNavigation()) {
        return;
      }

      if (this.isDocumentLevelElement(activeBefore)) {
        return;
      }

      activeBefore.focus({ preventScroll: true });
    }
  }

  private teardownSkipTo(): void {
    this.document.getElementById(SKIP_TO_STYLE_ID)?.remove();
    this.document.querySelectorAll('.skip-to').forEach((node) => node.remove());
  }

  private getSkipToSettings(): SkipToSettings {
    return {
      attachElement: this.attachElement,
      landmarks: this.landmarks,
      headings: this.headings,
      containerRole: this.containerRole,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      buttonLabel: this.buttonLabel,
      menuTextColor: this.menuTextColor,
      buttonBackgroundColor: this.buttonBackgroundColor,
      menuitemFocusTextColor: this.menuitemFocusTextColor,
      focusBorderColor: this.focusBorderColor,
      menuBackgroundColor: this.menuBackgroundColor,
      menuitemFocusBackgroundColor: this.menuitemFocusBackgroundColor,
      displayOption: this.displayOption,
      positionLeft: this.positionLeft,
      accesskey: this.accesskey,
    };
  }

  private getAttachElement(): HTMLElement {
    if (!this.attachElement) {
      return this.document.body;
    }

    return this.document.querySelector<HTMLElement>(this.attachElement) ?? this.document.body;
  }

  private getObservedNode(): Node | null {
    return this.getAttachElement() ?? this.document.body;
  }

  private isSkipToElement(element: Element): boolean {
    return !!element.closest('.skip-to');
  }

  private isVisible(element: HTMLElement): boolean {
    if (element.hasAttribute('hidden')) {
      return false;
    }

    const style = this.document.defaultView?.getComputedStyle(element);
    if (!style) {
      return true;
    }

    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  private isSkipToButton(element: HTMLElement | null): boolean {
    if (!element) {
      return false;
    }

    return !!element.closest('.skip-to') && element.tagName.toLowerCase() === 'button';
  }

  private getSkipToButton(): HTMLElement | null {
    return this.document.querySelector<HTMLElement>('.skip-to button');
  }

  private isDocumentLevelElement(element: HTMLElement | null): boolean {
    if (!element) {
      return true;
    }

    return element === this.document.body || element === this.document.documentElement;
  }

  private wasRecentTabNavigation(): boolean {
    return Date.now() - this.lastTabKeydownAt < 750;
  }
}
