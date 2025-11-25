const { computeDeltas, explainDeltas } = require('../lib/versionUtils');

jest.mock('../lib/ollamaClient', () => ({
  queryOllama: jest.fn(),
}));

const { queryOllama } = require('../lib/ollamaClient');

beforeEach(() => {
  process.env.LLM_PROVIDER = 'ollama';
  jest.clearAllMocks();
});

describe('computeDeltas', () => {
  test('computes simple deltas for metrics', () => {
    const first = {
      problemValidationScore: 50,
      marketMaturity: 50,
    };
    const latest = {
      problemValidationScore: 75,
      marketMaturity: 25,
    };

    const deltas = computeDeltas(first, latest);

    expect(deltas.problemValidationScore).toEqual({ from: 50, to: 75, delta: 25 });
    expect(deltas.marketMaturity).toEqual({ from: 50, to: 25, delta: -25 });
  });
});

describe('explainDeltas', () => {
  test('returns explanation string from LLM', async () => {
    queryOllama.mockResolvedValueOnce('This is an explanation.');

    const deltas = { problem_clarity: { change: 10, direction: 'up' } };
    const first = { problem_clarity: 50 };
    const latest = { problem_clarity: 60 };

    const explanation = await explainDeltas(deltas, first, latest);
    expect(explanation).toBe('This is an explanation.');
  });

  test('throws when LLM_PROVIDER is not ollama', async () => {
    process.env.LLM_PROVIDER = 'openai';

    const deltas = {};
    const first = {};
    const latest = {};

    await expect(explainDeltas(deltas, first, latest)).rejects.toThrow(/LLM_PROVIDER must be set to "ollama"/i);
  });
});
