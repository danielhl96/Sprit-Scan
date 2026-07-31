import { Component, EventEmitter, Input, NgModule, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

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
export class DockComponent {
  @Input() dockElements: DockElement[] = [
    {
      name: 'Home',
      route: '/',
      icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
      marked: true, // Mark the first element as active by default
    },
    {
      name: 'Scan',
      route: '/scan',
      icon: 'M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    },
    {
      name: 'Profile',
      route: '/profile',
      icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21c-2.676 0-5.216-.584-7.499-1.882z',
    },
    {
      name: 'History',
      route: '/history',
      icon: 'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
    },
  ];
  //Route will be emitted when a dock element is clicked, so the parent component can handle the navigation
  @Output() dockElementClick = new EventEmitter<string>();
  @Input() dockDisabled = true; // Input property to control the disabled state of the dock

  onDockElementClick(element: DockElement): void {
    this.dockElementClick.emit(element.route);
  }
  get DockElements(): DockElement[] {
    return this.dockElements;
  }
}
