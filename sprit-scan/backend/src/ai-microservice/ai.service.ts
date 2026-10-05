import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiKafkaProducerService } from './ai-kafka-producer.service';

import type { DataBodyExpert, DataBodySpirits } from '../types';

type SpiritStandardized = {
  name: string;
  description: string;
  taste?: string;
  origin?: string;
  recommendation?: string;
  year?: string;
  customerReview?: string;
  rawMaterials?: string;
  alternative?: string;
  price?: string;
};

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

@Injectable()
export class AiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaProducer: AiKafkaProducerService,
  ) {}

  async expert(userId: string, body: DataBodyExpert) {
    const prompt = this.extractPrompt(body);

    const systemPrompt =
      'You are an expert assistant for spirits and beverages. Answer clearly, factually, and concisely. Return plain text only.';

    const content = await this.requestOpenAiText({
      userId,
      systemPrompt,
      userContent: prompt,
      temperature: 0.4,
    });

    const result = { message: content };

    this.kafkaProducer.publish('ai.result.created', {
      type: 'expert',
      userId,
      result,
      createdAt: new Date().toISOString(),
    });

    return result;
  }

  async spirits(userId: string, body: DataBodySpirits) {
    const { imageUrl } = this.extractSpiritsInput(body);

    const systemPrompt = [
      'You are an assistant for structured spirits data extraction.',
      'Analyze the bottle image and return ONLY valid JSON (no markdown).',
      'Use exactly these fields:',
      'name, description, taste, origin, recommendation, year, customerReview, rawMaterials, alternative, price',
      'name and description are required.',
      'All other fields are optional; use null when unknown.',
    ].join(' ');

    const content = await this.requestOpenAiText({
      userId,
      systemPrompt,
      temperature: 0.2,
      responseFormat: { type: 'json_object' },
      userContent: [
        {
          type: 'text',
          text: 'Task: Analyze this spirit bottle image and extract standardized product information.',
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
        },
      ],
    });

    console.log('OpenAI response content:', content);

    let parsed: Partial<SpiritStandardized>;
    try {
      parsed = JSON.parse(content) as Partial<SpiritStandardized>;
    } catch {
      throw new InternalServerErrorException(
        'OpenAI did not return valid JSON',
      );
    }
    console.log('Parsed OpenAI response:', parsed);
    const result = this.normalizeSpiritResponse(parsed);

    this.kafkaProducer.publish('ai.result.created', {
      type: 'spirits',
      userId,
      result,
      createdAt: new Date().toISOString(),
    });

    return result;
  }

  private extractPrompt(body: DataBodyExpert): string {
    if (body.prompt.length > 0) return body.prompt.trim();

    throw new BadRequestException(
      'Request body must contain a string field "prompt"',
    );
  }

  private extractSpiritsInput(body: unknown): {
    imageUrl: string;
  } {
    if (typeof body !== 'object' || body === null) {
      throw new BadRequestException('Request body is required');
    }

    const data = body as {
      prompt?: unknown;
      imageUrl?: unknown;
      imageBase64?: unknown;
      imageMimeType?: unknown;
    };

    if (typeof data.imageUrl === 'string' && data.imageUrl.trim().length > 0) {
      return { imageUrl: data.imageUrl.trim() };
    }

    if (
      typeof data.imageBase64 === 'string' &&
      data.imageBase64.trim().length > 0
    ) {
      const mimeType =
        typeof data.imageMimeType === 'string' && data.imageMimeType.length > 0
          ? data.imageMimeType
          : 'image/jpeg';
      const imageUrl = `data:${mimeType};base64,${data.imageBase64.trim()}`;
      return { imageUrl };
    }

    throw new BadRequestException(
      'Request body must contain either "imageUrl" or "imageBase64"',
    );
  }

  private async requestOpenAiText(options: {
    userId: string;
    systemPrompt: string;
    userContent: string | Array<Record<string, unknown>>;
    temperature: number;
    responseFormat?: { type: 'json_object' };
    allowWebSearchFallback?: boolean;
  }): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured',
      );
    }

    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

    let primaryContent: string | undefined;
    let primaryError: unknown;

    try {
      primaryContent = await this.executeOpenAiChatCompletion(apiKey, {
        model,
        temperature: options.temperature,
        ...(options.responseFormat
          ? { response_format: options.responseFormat }
          : {}),
        messages: this.buildMessages(options),
      });
    } catch (error) {
      primaryError = error;
    }

    const shouldTryWebSearch =
      options.allowWebSearchFallback !== false &&
      (!primaryContent ||
        this.needsWebSearchFallback(primaryContent, options.responseFormat));

    if (shouldTryWebSearch) {
      const webSearchModel =
        process.env.OPENAI_WEB_MODEL ?? 'gpt-4o-search-preview';

      try {
        const webContent = await this.executeOpenAiChatCompletion(apiKey, {
          model: webSearchModel,
          temperature: options.temperature,
          ...(options.responseFormat
            ? { response_format: options.responseFormat }
            : {}),
          web_search_options: {
            search_context_size: 'medium',
          },
          messages: this.buildMessages(options, true),
        });

        if (webContent.trim().length > 0) {
          return webContent;
        }
      } catch {
        // Fall back to primary content if available.
      }
    }

    if (primaryContent) {
      return primaryContent;
    }

    if (primaryError instanceof Error) {
      throw new InternalServerErrorException(primaryError.message);
    }

    throw new InternalServerErrorException('OpenAI returned empty content');
  }

  private buildMessages(
    options: {
      userId: string;
      systemPrompt: string;
      userContent: string | Array<Record<string, unknown>>;
    },
    withWebSearchInstruction = false,
  ): Array<Record<string, unknown>> {
    const systemPrompt = withWebSearchInstruction
      ? `${options.systemPrompt} If required facts are missing or uncertain, use web search and then answer.`
      : options.systemPrompt;

    return [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content:
          typeof options.userContent === 'string'
            ? `UserId: ${options.userId}. Task: ${options.userContent}`
            : options.userContent,
      },
    ];
  }

  private needsWebSearchFallback(
    content: string,
    responseFormat?: { type: 'json_object' },
  ): boolean {
    if (responseFormat?.type === 'json_object') {
      try {
        const parsed = JSON.parse(content) as {
          name?: unknown;
          description?: unknown;
        };
        const name =
          typeof parsed.name === 'string'
            ? parsed.name.trim().toLowerCase()
            : '';
        const description =
          typeof parsed.description === 'string'
            ? parsed.description.trim().toLowerCase()
            : '';

        if (!name || !description) {
          return true;
        }

        const weakValues = ['unknown', 'n/a', 'no description', 'none'];
        return (
          weakValues.includes(name) ||
          weakValues.includes(description) ||
          description.length < 8
        );
      } catch {
        return true;
      }
    }

    const normalized = content.toLowerCase();
    return [
      "i don't know",
      'i do not know',
      'not enough information',
      'cannot determine',
      'unable to determine',
      'no reliable information',
      'cannot access',
    ].some((phrase) => normalized.includes(phrase));
  }

  private async executeOpenAiChatCompletion(
    apiKey: string,
    body: Record<string, unknown>,
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `OpenAI request failed (${response.status}): ${errorText}`,
      );
    }

    const payload = (await response.json()) as OpenAiChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new InternalServerErrorException('OpenAI returned empty content');
    }

    return content;
  }

  private normalizeSpiritResponse(
    data: Partial<SpiritStandardized>,
  ): SpiritStandardized {
    return {
      name: this.requiredText(data.name, 'Unknown Spirit'),
      description: this.requiredText(data.description, 'No Description'),
      taste: this.optionalText(data.taste),
      origin: this.optionalText(data.origin),
      recommendation: this.optionalText(data.recommendation),
      year: this.optionalText(data.year),
      customerReview: this.optionalText(data.customerReview),
      rawMaterials: this.optionalText(data.rawMaterials),
      alternative: this.optionalText(data.alternative),
      price: this.optionalText(data.price),
    };
  }

  private requiredText(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : fallback;
  }

  private optionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
