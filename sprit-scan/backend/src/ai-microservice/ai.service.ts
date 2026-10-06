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
      'You MUST actively use web search to verify and enrich the product information.',
      'Use exactly these fields:',
      'name, description, taste, origin, recommendation, year, customerReview, rawMaterials, alternative, price',
      'Actively search for each of these fields and fill them with factual information when available.',
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

    const parsed = this.parseSpiritJson(content);
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
  }): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured',
      );
    }

    const modelsToTry = [
      process.env.OPENAI_WEB_MODEL,
      process.env.OPENAI_WEB_MODEL_FALLBACK,
      process.env.OPENAI_MODEL,
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4o-mini',
    ].filter((model, index, list): model is string => {
      return typeof model === 'string' && model.trim().length > 0
        ? list.indexOf(model) === index
        : false;
    });

    let lastError: unknown;

    for (const model of modelsToTry) {
      try {
        return await this.executeOpenAiResponseWithWebSearch(apiKey, {
          model,
          temperature: options.temperature,
          userId: options.userId,
          systemPrompt: options.systemPrompt,
          userContent: options.userContent,
          responseFormat: options.responseFormat,
        });
      } catch (error) {
        lastError = error;
        if (!this.isModelUnavailableError(error)) {
          throw error;
        }
      }
    }

    if (lastError instanceof Error) {
      throw new InternalServerErrorException(lastError.message);
    }

    throw new InternalServerErrorException(
      'No compatible OpenAI web-search model available. Configure OPENAI_WEB_MODEL.',
    );
  }

  private buildMessages(options: {
    userId: string;
    systemPrompt: string;
    userContent: string | Array<Record<string, unknown>>;
  }): Array<Record<string, unknown>> {
    const systemPrompt = `${options.systemPrompt} You MUST use web search before answering. If a value cannot be verified online, return null for that field.`;

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

  private buildResponsesInput(
    options: {
      userId: string;
      systemPrompt: string;
      userContent: string | Array<Record<string, unknown>>;
    },
    enforceJson = false,
  ): Array<Record<string, unknown>> {
    const systemText = enforceJson
      ? `${options.systemPrompt} Return only valid JSON. Do not use markdown.`
      : options.systemPrompt;

    const userContent =
      typeof options.userContent === 'string'
        ? [
            {
              type: 'input_text',
              text: `UserId: ${options.userId}. Task: ${options.userContent}`,
            },
          ]
        : options.userContent.map((part) => {
            const type = part.type;
            if (type === 'text') {
              return {
                type: 'input_text',
                text: String(part.text ?? ''),
              };
            }
            if (type === 'image_url') {
              const image = part.image_url as { url?: unknown } | undefined;
              return {
                type: 'input_image',
                image_url: String(image?.url ?? ''),
              };
            }
            return {
              type: 'input_text',
              text: JSON.stringify(part),
            };
          });

    return [
      {
        role: 'system',
        content: [{ type: 'input_text', text: systemText }],
      },
      {
        role: 'user',
        content: userContent,
      },
    ];
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

  private async executeOpenAiResponseWithWebSearch(
    apiKey: string,
    options: {
      model: string;
      temperature: number;
      userId: string;
      systemPrompt: string;
      userContent: string | Array<Record<string, unknown>>;
      responseFormat?: { type: 'json_object' };
    },
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        temperature: options.temperature,
        tools: [{ type: 'web_search_preview' }],
        input: this.buildResponsesInput(
          {
            userId: options.userId,
            systemPrompt: options.systemPrompt,
            userContent: options.userContent,
          },
          options.responseFormat?.type === 'json_object',
        ),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `OpenAI request failed (${response.status}): ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };

    const contentFromOutput = payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) =>
        item.type ? item.type.includes('text') && !!item.text : !!item.text,
      )?.text;

    const content = payload.output_text ?? contentFromOutput;

    if (!content) {
      throw new InternalServerErrorException('OpenAI returned empty content');
    }

    return content;
  }

  private parseSpiritJson(content: string): Partial<SpiritStandardized> {
    const direct = this.tryParseJson(content);
    if (direct) {
      return direct;
    }

    const cleaned = content
      .replace(/```json/gi, '```')
      .replace(/```/g, '')
      .trim();

    const fromCleaned = this.tryParseJson(cleaned);
    if (fromCleaned) {
      return fromCleaned;
    }

    const jsonCandidate = this.extractFirstJsonObject(cleaned);
    if (jsonCandidate) {
      const fromExtracted = this.tryParseJson(jsonCandidate);
      if (fromExtracted) {
        return fromExtracted;
      }
    }

    throw new InternalServerErrorException('OpenAI did not return valid JSON');
  }

  private tryParseJson(input: string): Partial<SpiritStandardized> | null {
    try {
      return JSON.parse(input) as Partial<SpiritStandardized>;
    } catch {
      return null;
    }
  }

  private extractFirstJsonObject(text: string): string | null {
    const start = text.indexOf('{');
    if (start < 0) {
      return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }

    return null;
  }

  private isModelUnavailableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return (
      message.includes('model_not_found') ||
      message.includes('has been deprecated') ||
      message.includes('deprecated')
    );
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
