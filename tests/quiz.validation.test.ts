import { summarizeQuizSubmission } from '../src/modules/quiz/quiz.validation';

describe('summarizeQuizSubmission', () => {
  it('detects missing and duplicate answers', () => {
    const result = summarizeQuizSubmission([1, 2, 3, 4], [
      { questionId: 1, answerId: 10 },
      { questionId: 2, answerId: 20 },
      { questionId: 2, answerId: 21 },
    ]);

    expect(result.isValid).toBe(false);
    expect(result.missingQuestionIds).toEqual([3, 4]);
    expect(result.duplicateQuestionIds).toEqual([2]);
    expect(result.unexpectedQuestionIds).toEqual([]);
  });

  it('accepts exactly one answer per active question', () => {
    const result = summarizeQuizSubmission([1, 2, 3, 4], [
      { questionId: 1, answerId: 11 },
      { questionId: 2, answerId: 22 },
      { questionId: 3, answerId: 33 },
      { questionId: 4, answerId: 44 },
    ]);

    expect(result.isValid).toBe(true);
    expect(result.missingQuestionIds).toEqual([]);
    expect(result.duplicateQuestionIds).toEqual([]);
    expect(result.unexpectedQuestionIds).toEqual([]);
  });

  it('flags responses for non-active questions', () => {
    const result = summarizeQuizSubmission([1, 2], [
      { questionId: 1, answerId: 10 },
      { questionId: 2, answerId: 20 },
      { questionId: 99, answerId: 99 },
    ]);

    expect(result.isValid).toBe(false);
    expect(result.unexpectedQuestionIds).toEqual([99]);
  });
});
