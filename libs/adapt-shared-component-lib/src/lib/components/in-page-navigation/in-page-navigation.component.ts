import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  Renderer2,
} from '@angular/core';

@Component({
  selector: 'adapt-in-page-navigation',
  standalone: false,
  templateUrl: './in-page-navigation.component.html',
  styleUrl: './in-page-navigation.component.scss',
})
export class InPageNavigationComponent implements AfterViewInit, OnDestroy {
  @Input() headingLevel: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' = 'h4';
  @Input() titleText = 'On this page';
  @Input() selector = 'main';
  @Input() headingElements = 'h3';
  @Input() sections: HTMLElement[] = [];
  @Input() interactWithParent = false;

  private mutationObserver?: MutationObserver;
  private observedNode?: Node;
  private currentItem: HTMLElement | null = null;
  private navLinkCleanup: Array<() => void> = [];
  private headingSignature = '';
  private syncQueued = false;
  private inPageNavigation: any;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    import('@uswds/uswds/js').then((lib) => {
      this.inPageNavigation = lib.inPageNavigation;
      this.observeTargetContent();
      this.queueSync();
    });
  }

  ngOnDestroy(): void {
    this.disconnectObserver();
    this.clearNavLinkListeners();
  }

  private observeTargetContent() {
    const observedNode = this.getObservedNode();

    if (!observedNode) {
      return;
    }

    if (this.observedNode === observedNode) {
      return;
    }

    this.disconnectObserver();
    this.observedNode = observedNode;

    this.ngZone.runOutsideAngular(() => {
      this.mutationObserver = new MutationObserver(() => this.queueSync());
      this.mutationObserver.observe(observedNode, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['id'],
      });
    });
  }

  private disconnectObserver() {
    this.mutationObserver?.disconnect();
    this.mutationObserver = undefined;
    this.observedNode = undefined;
  }

  private queueSync() {
    if (this.syncQueued) {
      return;
    }

    this.syncQueued = true;

    this.ngZone.runOutsideAngular(() => {
      queueMicrotask(() => {
        this.syncQueued = false;
        this.ngZone.run(() => this.syncNavigationFromDom());
      });
    });
  }

  // The target headings can appear after first paint, so we watch the content
  // container and rebuild only when the heading set actually changes.
  private syncNavigationFromDom() {
    this.observeTargetContent();

    const targetContainer = this.getTargetContainer();

    if (!targetContainer) {
      this.headingSignature = '';
      return;
    }

    const headings = Array.from(targetContainer.querySelectorAll<HTMLElement>(this.headingElements));
    const nextSignature = headings
      .map((heading) => `${heading.tagName}:${heading.id}:${heading.textContent?.trim() ?? ''}`)
      .join('|');

    if (!headings.length) {
      this.headingSignature = '';
      this.clearNavLinkListeners();
      return;
    }

    if (nextSignature === this.headingSignature) {
      return;
    }

    this.headingSignature = nextSignature;
    this.inPageNavigation?.init(this.elementRef.nativeElement);
    this.bindNavLinkListeners();
  }

  private getTargetContainer(): HTMLElement | null {
    return this.elementRef.nativeElement.ownerDocument.querySelector<HTMLElement>(this.selector);
  }

  private getObservedNode(): Node | null {
    return this.getTargetContainer() ?? this.elementRef.nativeElement.ownerDocument.body;
  }

  private bindNavLinkListeners() {
    this.clearNavLinkListeners();

    const navLinks = this.elementRef.nativeElement.querySelectorAll<HTMLAnchorElement>('.usa-in-page-nav__link');
    navLinks.forEach((link) => {
      this.navLinkCleanup.push(
        this.renderer.listen(link, 'click', (event: Event) => this.handleClick(event))
      );
    });
  }

  private clearNavLinkListeners() {
    this.navLinkCleanup.forEach((cleanup) => cleanup());
    this.navLinkCleanup = [];
  }

  private handleClick(event: Event) {
    event.preventDefault();

    const target = event.currentTarget as HTMLAnchorElement | null;
    const href = target?.getAttribute('href');

    if (!href || !target) {
      return;
    }

    const targetId = this.getFragmentId(href);
    const targetElement = target.ownerDocument.getElementById(targetId);

    if (targetElement) {
      this.scrollAndUpdateClass(targetElement, target);
    }
  }

  private getFragmentId(href: string) {
    if (href.startsWith('#')) {
      return href.slice(1);
    }

    try {
      return new URL(href, this.elementRef.nativeElement.ownerDocument.location?.href).hash.slice(1);
    } catch {
      return '';
    }
  }

  private scrollAndUpdateClass(targetElement: HTMLElement, clickedItem: HTMLElement) {
    targetElement.setAttribute('tabindex', '-1');
    targetElement.scrollIntoView({ behavior: 'instant' });
    targetElement.focus({ preventScroll: true });
    targetElement.addEventListener(
      'blur',
      () => {
        targetElement.removeAttribute('tabindex');
      },
      { once: true }
    );

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.updateCurrentItem(clickedItem);
        });
      }, 100);
    });
  }

  private updateCurrentItem(newItem: HTMLElement) {
    const allItems = this.elementRef.nativeElement.querySelectorAll<HTMLElement>('.usa-in-page-nav__link');
    allItems.forEach((item) => {
      this.renderer.removeClass(item, 'usa-current');
    });

    this.renderer.addClass(newItem, 'usa-current');
    this.currentItem = newItem;
  }
}
