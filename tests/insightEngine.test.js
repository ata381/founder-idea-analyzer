const insightEngine = require('../lib/insightEngine');
const { generateScoresLLM, draftLeanCanvasLLM } = insightEngine;

jest.mock('../lib/ollamaClient', () => ({
  queryOllama: jest.fn(),
}));

const { queryOllama } = require('../lib/ollamaClient');

beforeEach(() => {
  process.env.LLM_PROVIDER = 'ollama';
  jest.clearAllMocks();
});

describe('internal parseJsonResponse', () => {
  test('exists and can parse basic JSON via generateScoresLLM flow', async () => {
    queryOllama.mockResolvedValueOnce('{"problemValidationScore": 50}');
    const result = await generateScoresLLM({ problem: 'p' });
    expect(result.problemValidationScore).toBe(50);
  });
});

describe('generateScoresLLM', () => {
  test('normalizes numeric fields to 0-100', async () => {
    queryOllama.mockResolvedValueOnce(
      JSON.stringify({
        problemValidationScore: 150,
        marketMaturity: -10,
        competitionDensity: 50,
        differentiationPotential: 75,
        technicalFeasibility: 0,
        riskAndUncertainty: 101,
      }),
    );

    const result = await generateScoresLLM({ problem: 'p', solution: 's' });

    expect(result).toEqual({
      problemValidationScore: 100,
      marketMaturity: 0,
      competitionDensity: 50,
      differentiationPotential: 75,
      technicalFeasibility: 0,
      riskAndUncertainty: 100,
    });
  });

  test('throws when LLM returns non-JSON', async () => {
    queryOllama.mockResolvedValueOnce('this is not json');

    await expect(generateScoresLLM({ problem: 'p' })).rejects.toThrow(/Unable to parse Ollama response for insight scores/i);
  });
});

describe('draftLeanCanvasLLM', () => {
  test('returns parsed canvas object from LLM', async () => {
    const canvas = { problem: 'p', solution: 's' };
    queryOllama.mockResolvedValueOnce(JSON.stringify(canvas));

    const result = await draftLeanCanvasLLM({ problem: 'p', solution: 's' });
    expect(result).toEqual(canvas);
  });
});
