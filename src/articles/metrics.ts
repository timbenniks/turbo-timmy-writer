const WORD_PATTERN = /[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu;
export const DEFAULT_READING_WORDS_PER_MINUTE = 220;

export type WritingMetrics = {
  wordCount: number;
  readingMinutes: number;
};

export function countWords(value: string) {
  return value.match(WORD_PATTERN)?.length ?? 0;
}

export function calculateWritingMetrics(
  plainText: string,
  wordsPerMinute = DEFAULT_READING_WORDS_PER_MINUTE,
): WritingMetrics {
  const wordCount = countWords(plainText);
  return {
    wordCount,
    readingMinutes: wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / wordsPerMinute)),
  };
}
