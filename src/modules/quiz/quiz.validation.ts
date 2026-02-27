export type QuizResponseInput = {
  questionId: number;
  answerId: number;
};

export type QuizSubmissionSummary = {
  isValid: boolean;
  missingQuestionIds: number[];
  duplicateQuestionIds: number[];
  unexpectedQuestionIds: number[];
};

function sortNumberList(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function summarizeQuizSubmission(
  activeQuestionIds: number[],
  responses: QuizResponseInput[],
): QuizSubmissionSummary {
  const active = sortNumberList(activeQuestionIds);
  const activeSet = new Set(active);
  const seen = new Map<number, number>();

  for (const response of responses) {
    seen.set(response.questionId, (seen.get(response.questionId) ?? 0) + 1);
  }

  const missingQuestionIds = active.filter((questionId) => !seen.has(questionId));
  const duplicateQuestionIds = [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([questionId]) => questionId)
    .sort((a, b) => a - b);
  const unexpectedQuestionIds = [...seen.keys()]
    .filter((questionId) => !activeSet.has(questionId))
    .sort((a, b) => a - b);

  return {
    isValid:
      responses.length > 0 &&
      missingQuestionIds.length === 0 &&
      duplicateQuestionIds.length === 0 &&
      unexpectedQuestionIds.length === 0,
    missingQuestionIds,
    duplicateQuestionIds,
    unexpectedQuestionIds,
  };
}
