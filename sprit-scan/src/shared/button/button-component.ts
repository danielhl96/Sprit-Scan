import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  templateUrl: './button-component.html',
  standalone: true,
  imports: [CommonModule],
})
export class ButtonComponent {
  @Output() buttonClick = new EventEmitter<void>();
  @Input() buttonText = 'Click Me';
  @Input() buttonColor = 'btn-primary';
  @Input() buttonBorderColor = 'border-primary';
  @Input() buttonSize: 'xs' | 'sm' | 'md' | 'lg' = 'md';
  @Input() buttonDisabled = false;
  @Input() buttonIcon = '';
  @Input() buttonSvgPath = '';
  @Input() loading = false;

  onButtonClick(): void {
    this.buttonClick.emit();
  }
}
