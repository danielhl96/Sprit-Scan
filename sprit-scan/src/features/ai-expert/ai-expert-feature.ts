import { signal, inject, Component, viewChild, ElementRef, effect } from '@angular/core';
import { TemplatePageComponent } from '../../shared/template-page/template-page-component';
import { ButtonComponent } from '../../shared/button/button-component';
import { ChatBubbleComponent } from '../../shared/chatbubble/chatbubble-component';
import { NotificationService } from '../../shared/notification/notification-service';
import { AiFeatureService } from './ai-expert-feature.service';
@Component({
  selector: 'ai-expert-feature',
  imports: [TemplatePageComponent, ButtonComponent, ChatBubbleComponent],
  templateUrl: './ai-expert-feature.html',
})
export class AiExpertFeature {
  private static readonly EXPERT_CONTEXT_WINDOW = 20;

  chatHistory = signal<
    { message: string; isUserMessage: boolean; id: number; imageUrl?: string }[]
  >([]);
  userInput = signal('');
  isLoading = signal(false);
  notify = inject(NotificationService);

  // Reference to the scrollable chat container
  chatContainer = viewChild<ElementRef<HTMLDivElement>>('chatContainer');

  constructor(private aiFeatureService: AiFeatureService) {
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

  handleAiFeatureExpert(
    newInput: string,
    expertContext: Array<{ role: 'user' | 'assistant'; message: string }>,
  ) {
    this.aiFeatureService.expert(newInput, expertContext).subscribe({
      next: (response: any) => {
        this.isLoading.set(false);
        this.chatHistory.update((history) => [
          ...history,
          { message: response.message, isUserMessage: false, id: history.length },
        ]);
      },
      error: (error) => {
        this.notify.showNotification('Error from AI service: ' + error.message, 'error');
        this.isLoading.set(false);
      },
    });
  }

  handleAiFeatureSprits(dataUrl: string) {
    this.aiFeatureService.sprits(dataUrl).subscribe({
      next: (response: any) => {
        console.log('AI response for image received:', response);
        this.isLoading.set(false);
        this.chatHistory.update((history) => [
          ...history,
          { message: response.description, isUserMessage: false, id: history.length },
        ]);
      },
      error: (error) => {
        console.error('Error from AI service for image:', error);
        this.isLoading.set(false);
        this.notify.showNotification('Error from AI service for image: ' + error.message, 'error');
      },
    });
  }

  setUserInput(newInput: string) {
    const expertContext = this.buildExpertContext();
    this.chatHistory.update((history) => [
      ...history,
      { message: newInput, isUserMessage: true, id: history.length },
    ]);
    this.isLoading.set(true);
    this.userInput.set(''); // Clear the input after sending
    this.handleAiFeatureExpert(newInput, expertContext);
  }

  private buildExpertContext(): Array<{ role: 'user' | 'assistant'; message: string }> {
    const maxMessages = AiExpertFeature.EXPERT_CONTEXT_WINDOW;

    return this.chatHistory()
      .map((entry) => ({
        role: entry.isUserMessage ? ('user' as const) : ('assistant' as const),
        message: entry.message?.trim() ?? '',
      }))
      .filter((entry) => entry.message.length > 0)
      .slice(-maxMessages);
  }

  handleImageSelected(file: File | undefined) {
    if (!file) {
      return;
    }
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
      this.isLoading.set(true);
      this.handleAiFeatureSprits(dataUrl);
    };
    reader.readAsDataURL(file);
  }
}
