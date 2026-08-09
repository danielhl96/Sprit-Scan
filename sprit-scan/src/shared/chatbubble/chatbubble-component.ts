import { input } from '@angular/core';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'chatbubble-component',
  templateUrl: './chatbubble-component.html',
  imports: [CommonModule],
})
export class ChatBubbleComponent {
  message = input('');
  isUserMessage = input(false);
}
