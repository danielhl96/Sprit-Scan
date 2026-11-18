import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { AiExpertFeature } from './ai-expert-feature';
import { NotificationService } from '../../shared/notification/notification-service';
import { AiFeatureService } from './ai-expert-feature.service';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { of, throwError } from 'rxjs';

describe('AiExpertFeature (Unit)', () => {
  let feature: AiExpertFeature;

  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: NotificationService, useValue: { showNotification: () => {} } },
        { provide: AiFeatureService, useValue: { expert: () => {}, sprits: () => {} } },
      ],
    });

    feature = TestBed.runInInjectionContext(
      () => new AiExpertFeature({ expert: () => {}, sprits: () => {} } as any),
    );
  });

  it('should handle api responses correctly', () => {
    const mockResponse = { message: 'This is a response from the AI service.' };
    const mockError = new Error('This is a simulated error.');

    // Mock the expert method to simulate a successful response
    jest.spyOn(feature['aiFeatureService'], 'expert').mockReturnValue(of(mockResponse));

    feature.handleAiFeatureExpert('Test input', []);
    expect(feature.isLoading()).toBe(false);
    expect(feature.chatHistory().length).toBe(1);
    expect(feature.chatHistory()[0].message).toBe(mockResponse.message);

    // Mock the expert method to simulate an error response
    jest.spyOn(feature['aiFeatureService'], 'expert').mockReturnValue(throwError(() => mockError));

    feature.handleAiFeatureExpert('Test input', []);
    expect(feature.isLoading()).toBe(false);
    expect(feature.chatHistory().length).toBe(1);
    expect(feature.chatHistory()[0].message).toBe(mockResponse.message);
  });

  it('should build expert context correctly and keep text from image messages', () => {
    feature.chatHistory.set([
      { message: 'Hello', isUserMessage: true, id: 0 },
      { message: 'Hi there!', isUserMessage: false, id: 1 },
      { message: 'How can I help you?', isUserMessage: false, id: 2 },
      { message: 'I need assistance.', isUserMessage: true, id: 3 },
      {
        message: 'Here is an image.',
        isUserMessage: true,
        id: 4,
        imageUrl: 'data:image/png;base64,...',
      },
      { message: 'This is a follow-up.', isUserMessage: false, id: 5 },
      { message: 'Another user message.', isUserMessage: true, id: 6 },
      { message: 'Final assistant message.', isUserMessage: false, id: 7 },
      {
        message: 'This message has an image.',
        isUserMessage: false,
        id: 8,
        imageUrl: 'data:image/png;base64,...',
      },
      { message: 'Last user message.', isUserMessage: true, id: 9 },
      { message: 'Last assistant message.', isUserMessage: false, id: 10 },
      {
        message: 'This is a user message with an image.',
        isUserMessage: true,
        id: 11,
        imageUrl: 'data:image/png;base64,...',
      },
      {
        message: 'This is an assistant message with an image.',
        isUserMessage: false,
        id: 12,
        imageUrl: 'data:image/png;base64,...',
      },
      { message: 'This is a user message without an image.', isUserMessage: true, id: 13 },
      { message: 'This is an assistant message without an image.', isUserMessage: false, id: 14 },
      {
        message: 'This is a user message with an image.',
        isUserMessage: true,
        id: 15,
        imageUrl: 'data:image/png;base64,...',
      },
      {
        message: 'This is an assistant message with an image.',
        isUserMessage: false,
        id: 16,
        imageUrl: 'data:image/png;base64,...',
      },
      { message: 'This is a user message without an image.', isUserMessage: true, id: 17 },
      { message: 'This is an assistant message without an image.', isUserMessage: false, id: 18 },
      {
        message: 'This is a user message with an image.',
        isUserMessage: true,
        id: 19,
        imageUrl: 'data:image/png;base64,...',
      },
      {
        message: 'This is an assistant message with an image.',
        isUserMessage: false,
        id: 20,
        imageUrl: 'data:image/png;base64,...',
      },
    ]);

    const context = feature['buildExpertContext']();
    console.log('Context:', context);

    expect(context).toEqual([
      { role: 'assistant', message: 'Hi there!' },
      { role: 'assistant', message: 'How can I help you?' },
      { role: 'user', message: 'I need assistance.' },
      { role: 'user', message: 'Here is an image.' },
      { role: 'assistant', message: 'This is a follow-up.' },
      { role: 'user', message: 'Another user message.' },
      { role: 'assistant', message: 'Final assistant message.' },
      { role: 'assistant', message: 'This message has an image.' },
      { role: 'user', message: 'Last user message.' },
      { role: 'assistant', message: 'Last assistant message.' },
      { role: 'user', message: 'This is a user message with an image.' },
      { role: 'assistant', message: 'This is an assistant message with an image.' },
      { role: 'user', message: 'This is a user message without an image.' },
      { role: 'assistant', message: 'This is an assistant message without an image.' },
      { role: 'user', message: 'This is a user message with an image.' },
      { role: 'assistant', message: 'This is an assistant message with an image.' },
      { role: 'user', message: 'This is a user message without an image.' },
      { role: 'assistant', message: 'This is an assistant message without an image.' },
      { role: 'user', message: 'This is a user message with an image.' },
      { role: 'assistant', message: 'This is an assistant message with an image.' },
    ]);
  });
});
