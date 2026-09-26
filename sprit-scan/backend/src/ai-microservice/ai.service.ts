import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

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
  async expert(userId: string, body: any) {
    const prompt = this.extractPrompt(body);

    const systemPrompt =
      'You are an expert assistant for spirits and beverages. Answer clearly, factually, and concisely. Return plain text only.';

    const content = await this.requestOpenAiText({
      userId,
      systemPrompt,
      userContent: prompt,
      temperature: 0.4,
    });

    return { message: content };
  }

  async spirits(userId: string, body: any) {
    const { imageUrl, prompt } = this.extractSpiritsInput(body);

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
          text:
            prompt && prompt.length > 0
              ? `Task: ${prompt}`
              : 'Task: Analyze this spirit bottle image and extract standardized product information.',
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
        },
      ],
    });

    let parsed: Partial<SpiritStandardized>;
    try {
      parsed = JSON.parse(content) as Partial<SpiritStandardized>;
    } catch {
      throw new InternalServerErrorException(
        'OpenAI did not return valid JSON',
      );
    }

    return this.normalizeSpiritResponse(parsed);
  }

  private extractPrompt(body: unknown): string {
    if (
      typeof body === 'object' &&
      body !== null &&
      'prompt' in body &&
      typeof (body as { prompt?: unknown }).prompt === 'string'
    ) {
      return ((body as { prompt: string }).prompt || '').trim();
    }

    throw new BadRequestException(
      'Request body must contain a string field "prompt"',
    );
  }

  private extractSpiritsInput(body: unknown): {
    imageUrl: string;
    prompt?: string;
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

    const prompt =
      typeof data.prompt === 'string' && data.prompt.trim().length > 0
        ? data.prompt.trim()
        : undefined;

    if (typeof data.imageUrl === 'string' && data.imageUrl.trim().length > 0) {
      return { imageUrl: data.imageUrl.trim(), prompt };
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
      return { imageUrl, prompt };
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured',
      );
    }

    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature,
        ...(options.responseFormat
          ? { response_format: options.responseFormat }
          : {}),
        messages: [
          { role: 'system', content: options.systemPrompt },
          {
            role: 'user',
            content:
              typeof options.userContent === 'string'
                ? `UserId: ${options.userId}. Task: ${options.userContent}`
                : options.userContent,
          },
        ],
      }),
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
      name: this.requiredText(data.name, 'Unbekannt'),
      description: this.requiredText(data.description, 'Keine Beschreibung'),
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
