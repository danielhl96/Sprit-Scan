import { signal, computed, inject, Component } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { ChatBubbleComponent } from '../../shared/chatbubble/chatbubble-component';
@Component({
  selector: 'ai-expert-feature',
  imports: [TemplatePageComponent, ButtonComponent, ChatBubbleComponent],
  templateUrl: './ai-expert-feature.html',
})
export class AiExpertFeature {
  chatHistory = signal<{ message: string; isUserMessage: boolean; id: number }[]>([]);
  userInput = signal('');
  isLoading = signal(false);

  setUserInput(newInput: string) {
    console.log('User input set to:', newInput);
    this.userInput.set(newInput);
    this.chatHistory.update((history) => [
      ...history,
      { message: newInput, isUserMessage: true, id: history.length },
    ]);
  }
}
