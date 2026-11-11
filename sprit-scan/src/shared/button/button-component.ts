import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  templateUrl: './button-component.html',
  standalone: true,
  imports: [CommonModule],
})
export class ButtonComponent {
  buttonClick = output<void>();
  buttonText = input('Click Me');
  buttonColor = input('btn-primary');
  buttonBorderColor = input('border-primary');
  buttonSize = input<'xs' | 'sm' | 'md' | 'lg'>('md');
  buttonDisabled = input(false);
  buttonIcon = input('');
  buttonSvgPath = input('');
  buttonImgSrc = input('');
  buttonImgAlt = input('');
  loading = input(false);

  onButtonClick(): void {
    this.buttonClick.emit();
  }
}
