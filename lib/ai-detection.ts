/** Model contributions explain the classifier, not whether AI actually wrote a passage. */
export interface AiDetectionExplanation {
  version: "char-contribution-v1";
  method: "character_pattern_logistic";
  items: Array<{
    question_index: number;
    pattern: string;
    excerpt: string;
    /** Unicode code point offsets within the normalized excerpt. */
    match_start: number;
    match_end: number;
    direction: "raises" | "lowers";
    contribution: number;
  }>;
  total_positive: number;
  total_negative: number;
  intercept: number;
  linear_score: number;
  omitted_contribution: number;
}
