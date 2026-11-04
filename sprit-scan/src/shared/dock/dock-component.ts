import { Component, EventEmitter, OnDestroy, OnInit, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ICONS } from '../icons';

export type DockElement = {
  name: string;
  route: string;
  /** SVG-Pfad (Heroicons, 24x24 outline) */
  icon: string;
  marked?: boolean; // Optional property to indicate if the element is marked
};

@Component({
  selector: 'app-dock',
  templateUrl: './dock-component.html',
  standalone: true,
  imports: [CommonModule],
})
export class DockComponent implements OnInit, OnDestroy {
  @Input() dockElements: DockElement[] = [
    {
      name: 'Home',
      route: '/home',
      icon: ICONS.home,
      marked: false,
    },
    {
      name: 'Scan',
      route: '/scan',
      icon: ICONS.scan,
      marked: false,
    },
    {
      name: 'Profile',
      route: '/profile',
      icon: ICONS.profile,
      marked: false,
    },
    {
      name: 'AI',
      route: '/ai-expert',
      icon: ICONS.ai,
      marked: false,
    },
    {
      name: 'History',
      route: '/history',
      icon: ICONS.history,
      marked: false,
    },
  ];
  router = inject(Router);
  private routeSubscription?: Subscription;
  private zoomResetTimeoutId?: number;
  private pendingScrollTimeoutId?: number;
  zoomedRoute: string | null = null;

  ngOnInit(): void {
    this.updateMarkedRoute(this.router.url);
    this.scrollDockRouteIntoView(this.getPathWithoutQueryOrHash(this.router.url), false);

    this.routeSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navigation = event as NavigationEnd;
        const route = this.getPathWithoutQueryOrHash(navigation.urlAfterRedirects);
        this.updateMarkedRoute(route);
        this.scrollDockRouteIntoView(route, false);
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    if (this.zoomResetTimeoutId) {
      window.clearTimeout(this.zoomResetTimeoutId);
    }
    if (this.pendingScrollTimeoutId) {
      window.clearTimeout(this.pendingScrollTimeoutId);
    }
  }

  openFileInput(): void {
    document.getElementById('fileInput')?.click();
  }

  private updateMarkedRoute(url: string): void {
    const currentPath = this.getPathWithoutQueryOrHash(url);

    this.dockElements = this.dockElements.map((element) => ({
      ...element,
      marked: currentPath === element.route,
    }));
  }

  private getPathWithoutQueryOrHash(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  navigateToRoute(route: string): void {
    this.router.navigate([route]);
  }
  //Route will be emitted when a dock element is clicked, so the parent component can handle the navigation
  @Output() dockElementClick = new EventEmitter<string>();
  @Input() dockDisabled = true; // Input property to control the disabled state of the dock

  onDockElementClick(element: DockElement, event: MouseEvent): void {
    this.scrollToDockElement(event);
    this.zoomDockElement(element.route);

    if (element.route === '/scan') {
      this.openFileInput();
      return;
    }

    this.dockElementClick.emit(element.route);
    this.updateMarkedRoute(element.route);
    this.navigateToRoute(element.route);
  }

  private scrollToDockElement(event: MouseEvent): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    this.scrollElementIntoDockCenter(target, true);
  }

  private scrollDockRouteIntoView(route: string, smooth: boolean): void {
    if (this.pendingScrollTimeoutId) {
      window.clearTimeout(this.pendingScrollTimeoutId);
    }

    this.pendingScrollTimeoutId = window.setTimeout(() => {
      const element = document.querySelector(`[data-dock-route="${route}"]`);
      if (!(element instanceof HTMLElement)) {
        return;
      }
      this.scrollElementIntoDockCenter(element, smooth);
    }, 0);
  }

  private scrollElementIntoDockCenter(element: HTMLElement, smooth: boolean): void {
    const scroller = element.closest('[data-dock-scroller]');
    if (!(scroller instanceof HTMLElement)) {
      element.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'nearest',
        inline: 'center',
      });
      return;
    }

    const targetLeft = element.offsetLeft - (scroller.clientWidth - element.offsetWidth) / 2;
    const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const left = Math.min(Math.max(0, targetLeft), maxScrollLeft);

    scroller.scrollTo({
      left,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  private zoomDockElement(route: string): void {
    this.zoomedRoute = route;

    if (this.zoomResetTimeoutId) {
      window.clearTimeout(this.zoomResetTimeoutId);
    }

    this.zoomResetTimeoutId = window.setTimeout(() => {
      this.zoomedRoute = null;
    }, 220);
  }

  get DockElements(): DockElement[] {
    return this.dockElements;
  }
}
