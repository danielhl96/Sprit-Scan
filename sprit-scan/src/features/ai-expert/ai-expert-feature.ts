import { signal, computed, inject, Component, viewChild, ElementRef, effect } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { ChatBubbleComponent } from '../../shared/chatbubble/chatbubble-component';
@Component({
  selector: 'ai-expert-feature',
  imports: [TemplatePageComponent, ButtonComponent, ChatBubbleComponent],
  templateUrl: './ai-expert-feature.html',
})
export class AiExpertFeature {
  chatHistory = signal<
    { message: string; isUserMessage: boolean; id: number; imageUrl?: string }[]
  >([]);
  userInput = signal('');
  isLoading = signal(false);

  // Reference to the scrollable chat container
  chatContainer = viewChild<ElementRef<HTMLDivElement>>('chatContainer');

  constructor() {
    // Whenever chatHistory changes, scroll smoothly to the newest message
    effect(() => {
      // Track chatHistory so the effect re-runs on updates
      this.chatHistory();
      const container = this.chatContainer()?.nativeElement;
      if (container) {
        // Wait for the DOM to render the new bubble before scrolling
        setTimeout(() => {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        });
      }
    });
  }

  setUserInput(newInput: string) {
    console.log('User input set to:', newInput);
    this.userInput.set(newInput);
    this.chatHistory.update((history) => [
      ...history,
      { message: newInput, isUserMessage: true, id: history.length },
    ]);
    this.userInput.set(''); // Clear the input after sending
  }

  handleImageSelected(file: File | undefined) {
    if (!file) {
      return;
    }
    console.log('Image selected:', file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.chatHistory.update((history) => [
        ...history,
        {
          message: this.userInput(),
          imageUrl: dataUrl,
          isUserMessage: true,
          id: history.length,
        },
      ]);
      this.userInput.set(''); // Clear the input after sending
    };
    reader.readAsDataURL(file);
  }
}
