import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FilterPanelService {
  private filterPanelSource = new BehaviorSubject<boolean>(false);
  currentFilterPanelState = this.filterPanelSource.asObservable();

  /**
   * Finds an element within the shadow DOM using a selector.
   *
   * @param selector - The selector to search for.
   * @param root - The root element to start the search from. Defaults to the document.
   * @returns The found element, or null if not found.
   */
  // Necessary to search through shadow DOM for the close button, or else it never responds to the .focus() call
  findElementInShadowDom(selector: any, root: Document | ShadowRoot = document): Element | null {
    const element = root.querySelector(selector);
    if (element) {
      return element;
    }
    const shadowRoots = Array.from(root.querySelectorAll('*')).filter((e) => e.shadowRoot);
    for (const shadowRoot of shadowRoots) {
      if (shadowRoot.shadowRoot) {
        const foundElement = this.findElementInShadowDom(selector, shadowRoot.shadowRoot);
        if (foundElement) {
          return foundElement;
        }
      }
    }
    return null; // Element not found
  }

  /**
   * Changes the state of the filter panel.
   *
   * @param state - The new state of the filter panel.
   */
  changeFilterPanelState(state: boolean) {
    this.filterPanelSource.next(state);
    if (state) {
      return;
    }

    const element = this.findElementInShadowDom('#filterPanelButton');

    if (element) {
      setTimeout(() => (element as HTMLElement).focus(), 0); // Using setTimeout to ensure the element is ready to receive focus
    }
  }
}
