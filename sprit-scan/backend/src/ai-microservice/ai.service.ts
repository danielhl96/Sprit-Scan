import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiKafkaProducerService } from './ai-kafka-producer.service';
import { z } from 'zod';
import type { DataBodyExpert, DataBodySpirits } from '../types';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

type ExpertTurn = {
  userPrompt: string;
  assistantResponse: string;
};

@Injectable()
export class AiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaProducer: AiKafkaProducerService,
  ) {}

  /**
   * Zod schema that defines the structured output for spirit extraction.
   * It is sent to OpenAI (via zodTextFormat) so the model is forced to return
   * exactly these fields. Required: name, description. All others are nullable
   * and should be null when the information is unknown.
   */
  private readonly ReturnSchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    taste: z.string().nullable(),
    origin: z.string().nullable(),
    recommendation: z.string().nullable(),
    year: z.string().nullable(),
    customerReview: z.string().nullable(),
    rawMaterials: z.string().nullable(),
    alternative: z.string().nullable(),
    price: z.string().nullable(),
  });

  /**
   * Handles a free-form expert question about spirits/beverages.
   * Returns a plain text answer (web search enabled) wrapped in { message }.
   */
  async expert(userId: string, body: DataBodyExpert) {
    const prompt = this.extractPrompt(body);

    const systemPrompt =
      'Du bist ein Experten-Assistent für Spirituosen und Getränke. Antworte immer auf Deutsch, klar, sachlich, kurz und prägnant. Gib ausschließlich reinen Text zurück.';

    const contextTurns = this.buildExpertContextFromBody(body);
    const expertInput = this.buildExpertContextInput(
      userId,
      systemPrompt,
      contextTurns,
      prompt,
    );

    const message = await this.requestOpenAiText({
      userId,
      systemPrompt,
      userContent: prompt,
      input: expertInput,
      temperature: 0.2,
    });

    const result = { message };

    return result;
  }

  /**
   * Analyzes a spirit bottle image and extracts standardized product data.
   * Uses OpenAI structured outputs (ReturnSchema) plus web search, then
   * publishes the result to Kafka for the history service to persist.
   */
  async spirits(userId: string, body: DataBodySpirits) {
    const imageUrl = body.imageUrl;
    const systemPrompt = [
      'Du bist ein Assistent zur strukturierten Extraktion von Spirituosen-Daten.',
      'Antworte immer auf Deutsch, kurz und prägnant.',
      'Analysiere das Flaschenbild und gib die angeforderten strukturierten Daten zurück.',
      'Du MUSST aktiv die Websuche nutzen, um die Produktinformationen zu verifizieren und anzureichern.',
      'Keine Internet-Links in der Ausgabe erlaubt; gib nur sachliche Informationen zurück.',
      'Suche aktiv zu jedem Feld und fülle es mit sachlichen Informationen, sofern verfügbar.',
      'name und description sind erforderlich.',
      'Alle anderen Felder sind optional; nutze null, wenn unbekannt.',
    ].join(' ');

    const result = await this.requestOpenAiStructured({
      userId,
      systemPrompt,
      temperature: 0.2,
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

    this.kafkaProducer.publish('ai.result.created', {
      type: 'spirits',
      userId,
      result,
      createdAt: new Date().toISOString(),
    });
    return result;
  }

  /**
   * Validates and trims the user prompt from the request body.
   * Throws a BadRequestException when the prompt is missing/empty.
   */
  private extractPrompt(body: DataBodyExpert): string {
    if (body.prompt.length > 0) return body.prompt.trim();

    throw new BadRequestException(
      'Request body must contain a string field "prompt"',
    );
  }

  /**
   * Creates an OpenAI client using the API key from configuration.
   * Throws when OPENAI_API_KEY is not set.
   */
  private createOpenAiClient(): OpenAI {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured',
      );
    }

    return new OpenAI({ apiKey });
  }

  /**
   * Resolves the model name to use, preferring a web-capable model,
   * falling back to the default model and finally to 'gpt-4o-mini'.
   */
  private getModel(): string {
    return (
      process.env.OPENAI_WEB_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    );
  }

  /**
   * Sends a request to the OpenAI Responses API and returns plain text.
   * Web search is always enabled. Used for free-form answers (expert).
   */
  private async requestOpenAiText(options: {
    userId: string;
    systemPrompt: string;
    userContent: string | Array<Record<string, unknown>>;
    input?: Array<Record<string, unknown>>;
    temperature: number;
  }): Promise<string> {
    const openai = this.createOpenAiClient();

    const response = await openai.responses.create({
      model: this.getModel(),
      temperature: options.temperature,
      tools: [{ type: 'web_search_preview' }],
      input: (options.input ?? this.buildResponsesInput(options)) as any,
    });

    const content = response.output_text;
    if (!content) {
      throw new InternalServerErrorException('OpenAI returned empty content');
    }

    return content;
  }

  /**
   * Sends a request to the OpenAI Responses API using structured outputs.
   * The response is parsed and validated against ReturnSchema by OpenAI,
   * so no local JSON parsing is needed. Web search is always enabled.
   */
  private async requestOpenAiStructured(options: {
    userId: string;
    systemPrompt: string;
    userContent: string | Array<Record<string, unknown>>;
    temperature: number;
  }): Promise<z.infer<typeof this.ReturnSchema>> {
    const openai = this.createOpenAiClient();

    const response = await openai.responses.parse({
      model: this.getModel(),
      temperature: options.temperature,
      tools: [{ type: 'web_search_preview' }],
      input: this.buildResponsesInput(options) as any,
      text: {
        format: zodTextFormat(this.ReturnSchema, 'spirit'),
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      throw new InternalServerErrorException(
        'OpenAI did not return structured output',
      );
    }

    return parsed;
  }

  /**
   * Adapter that converts the internal, simple input (a string or an array of
   * text/image parts) into the role-based message format expected by the
   * OpenAI Responses API (input_text / input_image). Shared by both request
   * methods to avoid duplication.
   */
  private buildResponsesInput(options: {
    userId: string;
    systemPrompt: string;
    userContent: string | Array<Record<string, unknown>>;
  }): Array<Record<string, unknown>> {
    const userContent =
      typeof options.userContent === 'string'
        ? [
            {
              type: 'input_text',
              text: `UserId: ${options.userId}. Task: ${options.userContent}`,
            },
          ]
        : options.userContent.map((part) => {
            if (part.type === 'text') {
              return {
                type: 'input_text',
                text: String(part.text ?? ''),
              };
            }

            if (part.type === 'image_url') {
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
        content: [{ type: 'input_text', text: options.systemPrompt }],
      },
      {
        role: 'user',
        content: userContent,
      },
    ];
  }

  /**
   * Builds a role-based conversation input with a temporary per-user context
   * window, so follow-up questions can rely on recent history.
   */
  private buildExpertContextInput(
    userId: string,
    systemPrompt: string,
    contextTurns: ExpertTurn[],
    prompt: string,
  ): Array<Record<string, unknown>> {
    const input: Array<Record<string, unknown>> = [
      {
        role: 'system',
        content: [{ type: 'input_text', text: systemPrompt }],
      },
    ];

    for (const turn of contextTurns) {
      input.push({
        role: 'user',
        content: [{ type: 'input_text', text: turn.userPrompt }],
      });

      input.push({
        role: 'assistant',
        content: [{ type: 'input_text', text: turn.assistantResponse }],
      });
    }

    input.push({
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: `UserId: ${userId}. Task: ${prompt}`,
        },
      ],
    });

    return input;
  }

  private buildExpertContextFromBody(body: DataBodyExpert): ExpertTurn[] {
    const context = Array.isArray(body.context) ? body.context : [];
    const parsedWindow = Number(process.env.EXPERT_CONTEXT_WINDOW ?? '6');
    const maxTurns =
      Number.isFinite(parsedWindow) && parsedWindow > 0
        ? Math.floor(parsedWindow)
        : 6;

    const normalized = context
      .filter((item) => item && typeof item.message === 'string')
      .map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        message: item.message.trim(),
      }))
      .filter((item) => item.message.length > 0)
      .slice(-maxTurns * 2);

    const turns: ExpertTurn[] = [];
    let pendingUserPrompt: string | null = null;

    for (const item of normalized) {
      if (item.role === 'user') {
        pendingUserPrompt = item.message;
        continue;
      }

      if (pendingUserPrompt) {
        turns.push({
          userPrompt: pendingUserPrompt,
          assistantResponse: item.message,
        });
        pendingUserPrompt = null;
      }
    }

    return turns;
  }
}
