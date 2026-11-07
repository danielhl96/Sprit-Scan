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
  private static readonly EXPERT_CONTEXT_WINDOW = 6;

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

  setUserInput(newInput: string) {
    console.log('User input set to:', newInput);
    const expertContext = this.buildExpertContext();

    this.userInput.set(newInput);
    this.chatHistory.update((history) => [
      ...history,
      { message: newInput, isUserMessage: true, id: history.length },
    ]);
    this.userInput.set(''); // Clear the input after sending
    this.isLoading.set(true);
    this.aiFeatureService.expert(newInput, expertContext).subscribe({
      next: (response: any) => {
        console.log('AI response received:', response);
        this.isLoading.set(false);
        this.chatHistory.update((history) => [
          ...history,
          { message: response.message, isUserMessage: false, id: history.length },
        ]);
      },
      error: (error) => {
        console.error('Error from AI service:', error);
        this.notify.showNotification('Error from AI service: ' + error.message, 'error');
        this.isLoading.set(false);
      },
    });
  }

  private buildExpertContext(): Array<{ role: 'user' | 'assistant'; message: string }> {
    const maxMessages = AiExpertFeature.EXPERT_CONTEXT_WINDOW * 2;

    return this.chatHistory()
      .filter((entry) => !entry.imageUrl)
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
      this.isLoading.set(true);
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
          this.notify.showNotification(
            'Error from AI service for image: ' + error.message,
            'error',
          );
        },
      });
    };
    reader.readAsDataURL(file);
  }
}
