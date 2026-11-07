import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('openai/helpers/zod', () => ({
  zodTextFormat: jest.fn(() => ({ type: 'json_schema', name: 'spirit' })),
}));

const mockResponsesCreate = jest.fn();
const mockResponsesParse = jest.fn();
const mockOpenAIConstructor = jest.fn().mockImplementation(() => ({
  responses: {
    create: mockResponsesCreate,
    parse: mockResponsesParse,
  },
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: mockOpenAIConstructor,
}));

const { AiService } = require('../ai.service');

describe('AiService (Unit)', () => {
  let service: InstanceType<typeof AiService>;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'OPENAI_API_KEY') {
        return 'test-openai-key';
      }
      return undefined;
    }),
  };

  const kafkaProducerMock = {
    publish: jest.fn(),
  };

  const validStructuredResponse = {
    name: 'Tanqueray London Dry Gin',
    description: 'Classic London Dry Gin with juniper-forward profile.',
    taste: 'Juniper, citrus, dry finish',
    origin: 'United Kingdom',
    recommendation: 'Best served as Gin & Tonic',
    year: null,
    customerReview: 'Popular for balanced botanicals',
    rawMaterials: 'Juniper, coriander, angelica root',
    alternative: 'Bombay Sapphire',
    price: '29.99 EUR',
  };

  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.OPENAI_WEB_MODEL;
    delete process.env.OPENAI_MODEL;

    service = new AiService(configServiceMock as any, kafkaProducerMock as any);

    configServiceMock.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') {
        return 'test-openai-key';
      }
      return undefined;
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('expert()', () => {
    it('should return a message for a valid prompt', async () => {
      mockResponsesCreate.mockResolvedValue({ output_text: 'Valid AI answer' });

      const result = await service.expert('user-1', {
        prompt: '  What is single malt whisky?  ',
      });

      expect(result).toEqual({ message: 'Valid AI answer' });
      expect(mockOpenAIConstructor).toHaveBeenCalledWith({
        apiKey: 'test-openai-key',
      });
      expect(mockResponsesCreate).toHaveBeenCalledTimes(1);

      const createPayload = mockResponsesCreate.mock.calls[0][0];
      expect(createPayload.model).toBe('gpt-4o-mini');
      expect(createPayload.tools).toEqual([{ type: 'web_search_preview' }]);
      expect(createPayload.input[0].role).toBe('system');
      expect(createPayload.input[1].role).toBe('user');
      expect(createPayload.input[1].content[0].text).toContain(
        'Task: What is single malt whisky?',
      );
    });

    it('should throw BadRequestException for an empty prompt', async () => {
      await expect(service.expert('user-1', { prompt: '' })).rejects.toThrow(
        BadRequestException,
      );

      expect(mockResponsesCreate).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only prompt (edge case)', async () => {
      mockResponsesCreate.mockResolvedValue({
        output_text: 'Fallback response',
      });

      const result = await service.expert('edge-user', { prompt: '    ' });

      expect(result).toEqual({ message: 'Fallback response' });
      const createPayload = mockResponsesCreate.mock.calls[0][0];
      expect(createPayload.input[1].content[0].text).toBe(
        'UserId: edge-user. Task: ',
      );
    });

    it('should handle a very long prompt (boundary value)', async () => {
      const longPrompt = 'a'.repeat(10_000);
      mockResponsesCreate.mockResolvedValue({
        output_text: 'Long prompt handled',
      });

      const result = await service.expert('boundary-user', {
        prompt: longPrompt,
      });

      expect(result).toEqual({ message: 'Long prompt handled' });
      const createPayload = mockResponsesCreate.mock.calls[0][0];
      expect(createPayload.input[1].content[0].text).toContain(longPrompt);
    });

    it('should throw InternalServerErrorException when OpenAI returns empty content', async () => {
      mockResponsesCreate.mockResolvedValue({ output_text: '' });

      await expect(
        service.expert('user-1', { prompt: 'Tell me about gin' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when OPENAI_API_KEY is missing', async () => {
      configServiceMock.get.mockReturnValue(undefined);

      await expect(
        service.expert('user-1', { prompt: 'Tell me about rum' }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockOpenAIConstructor).not.toHaveBeenCalled();
      expect(mockResponsesCreate).not.toHaveBeenCalled();
    });

    it('should include frontend-provided context turns in the expert request', async () => {
      mockResponsesCreate.mockResolvedValue({ output_text: 'Antwort 2' });

      await service.expert('context-user', {
        prompt: 'Und was ist der Unterschied zu Vodka?',
        context: [
          { role: 'user', message: 'Was ist Gin?' },
          { role: 'assistant', message: 'Antwort 1' },
        ],
      });

      const payload = mockResponsesCreate.mock.calls[0][0];
      expect(payload.input).toHaveLength(4);
      expect(payload.input[1].role).toBe('user');
      expect(payload.input[1].content[0].text).toBe('Was ist Gin?');
      expect(payload.input[2].role).toBe('assistant');
      expect(payload.input[2].content[0].text).toBe('Antwort 1');
      expect(payload.input[3].role).toBe('user');
      expect(payload.input[3].content[0].text).toContain(
        'Und was ist der Unterschied zu Vodka?',
      );
    });
  });

  describe('spirits()', () => {
    it('should return structured result and publish a Kafka event for valid input', async () => {
      mockResponsesParse.mockResolvedValue({
        output_parsed: validStructuredResponse,
      });

      const result = await service.spirits('user-42', {
        imageUrl: 'https://example.com/spirit.jpg',
      });

      expect(result).toEqual(validStructuredResponse);
      expect(mockResponsesParse).toHaveBeenCalledTimes(1);

      const parsePayload = mockResponsesParse.mock.calls[0][0];
      expect(parsePayload.model).toBe('gpt-4o-mini');
      expect(parsePayload.tools).toEqual([{ type: 'web_search_preview' }]);
      expect(parsePayload.input[1].content[1]).toEqual({
        type: 'input_image',
        image_url: 'https://example.com/spirit.jpg',
      });

      expect(kafkaProducerMock.publish).toHaveBeenCalledWith(
        'ai.result.created',
        expect.objectContaining({
          type: 'spirits',
          userId: 'user-42',
          result: validStructuredResponse,
          createdAt: expect.any(String),
        }),
      );
    });

    it('should throw InternalServerErrorException when structured output is missing', async () => {
      mockResponsesParse.mockResolvedValue({ output_parsed: null });

      await expect(
        service.spirits('user-1', { imageUrl: 'https://example.com/a.jpg' }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(kafkaProducerMock.publish).not.toHaveBeenCalled();
    });

    it('should handle empty imageUrl as edge input and still call OpenAI', async () => {
      mockResponsesParse.mockResolvedValue({
        output_parsed: validStructuredResponse,
      });

      const result = await service.spirits('user-edge', { imageUrl: '' });

      expect(result).toEqual(validStructuredResponse);
      const parsePayload = mockResponsesParse.mock.calls[0][0];
      expect(parsePayload.input[1].content[1]).toEqual({
        type: 'input_image',
        image_url: '',
      });
    });

    it('should handle missing imageUrl as edge input and normalize to empty string', async () => {
      mockResponsesParse.mockResolvedValue({
        output_parsed: validStructuredResponse,
      });

      const result = await service.spirits('user-edge-2', {});

      expect(result).toEqual(validStructuredResponse);
      const parsePayload = mockResponsesParse.mock.calls[0][0];
      expect(parsePayload.input[1].content[1]).toEqual({
        type: 'input_image',
        image_url: '',
      });
    });
  });

  describe('private helper methods', () => {
    it('extractPrompt should trim valid prompt', () => {
      const prompt = (service as any).extractPrompt({ prompt: '  abc  ' });
      expect(prompt).toBe('abc');
    });

    it('extractPrompt should throw for empty prompt', () => {
      expect(() => (service as any).extractPrompt({ prompt: '' })).toThrow(
        BadRequestException,
      );
    });

    it('getModel should prioritize OPENAI_WEB_MODEL over OPENAI_MODEL', () => {
      process.env.OPENAI_MODEL = 'gpt-4o-mini';
      process.env.OPENAI_WEB_MODEL = 'gpt-4.1-mini';

      expect((service as any).getModel()).toBe('gpt-4.1-mini');
    });

    it('getModel should fallback to OPENAI_MODEL when OPENAI_WEB_MODEL is not set', () => {
      process.env.OPENAI_MODEL = 'gpt-4o';
      delete process.env.OPENAI_WEB_MODEL;

      expect((service as any).getModel()).toBe('gpt-4o');
    });

    it('buildResponsesInput should map mixed content parts correctly', () => {
      const input = (service as any).buildResponsesInput({
        userId: 'mixed-user',
        systemPrompt: 'System prompt',
        userContent: [
          { type: 'text', text: 'hello' },
          {
            type: 'image_url',
            image_url: { url: 'https://img.example/a.png' },
          },
          { type: 'custom', foo: 'bar' },
        ],
      });

      expect(input).toEqual([
        {
          role: 'system',
          content: [{ type: 'input_text', text: 'System prompt' }],
        },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: 'hello' },
            { type: 'input_image', image_url: 'https://img.example/a.png' },
            {
              type: 'input_text',
              text: JSON.stringify({ type: 'custom', foo: 'bar' }),
            },
          ],
        },
      ]);
    });
  });
});
