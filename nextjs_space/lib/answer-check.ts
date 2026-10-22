// Deterministic answer checking — avoids an LLM round-trip for objectively
// gradeable answers. Handles: exact match, number equality (incl. decimals,
// fractions, mixed numbers, word numbers), currency/unit stripping, and
// "4 apples" vs "4" style answers.

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

/** Lowercase, trim, strip punctuation/currency/thousands separators. */
function normalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, '')
    .replace(/[$€£]/g, '')
    .replace(/(\d),(?=\d{3}(\D|$))/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse a token as a number: "4", "0.5", "1/2", "1 1/2", "seven", "twenty one". */
function parseNumber(token: string): number | null {
  const s = token.trim();
  if (!s) return null;

  // Word numbers (simple words and compounds like "twenty one")
  const words = s.split(/[\s-]+/).filter(Boolean);
  if (words.length > 0 && words.length <= 3 && words.every(w => w in WORD_NUMBERS)) {
    return words.reduce((sum, w) => sum + WORD_NUMBERS[w], 0);
  }

  // Mixed number: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = parseFloat(mixed[1]);
    const num = parseFloat(mixed[2]);
    const den = parseFloat(mixed[3]);
    if (den !== 0) return whole + num / den;
  }

  // Simple fraction: "1/2"
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const den = parseFloat(frac[2]);
    if (den !== 0) return parseFloat(frac[1]) / den;
  }

  // Strict numeric parse — Number() rejects strings with trailing words
  // ("4 apples" → NaN) unlike parseFloat ("4 apples" → 4).
  const num = Number(s);
  return s !== '' && Number.isFinite(num) ? num : null;
}

/** Numbers appearing in the string, in order. */
function numbersIn(s: string): number[] {
  return (s.match(/\d+(\.\d+)?|\d+\/\d+/g) ?? [])
    .map((t) => parseNumber(t))
    .filter((n): n is number => n !== null);
}

function numbersEqual(a: number, b: number): boolean {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= scale * 1e-9;
}

/**
 * True when the student answer is objectively equivalent to the correct
 * answer. Conservative by design: if unsure, returns false so the LLM
 * (or a human) can adjudicate instead of wrongly marking correct.
 */
export function isAnswerCorrect(studentAnswer: string, correctAnswer: string): boolean {
  const student = normalize(studentAnswer ?? '');
  const correct = normalize(correctAnswer ?? '');
  if (!student || !correct) return false;

  // 1. Exact match
  if (student === correct) return true;

  // 2. Whole-string number comparison ("0.5" vs "1/2", "seven" vs "7")
  const studentNum = parseNumber(student);
  const correctNum = parseNumber(correct);
  if (studentNum !== null && correctNum !== null) {
    return numbersEqual(studentNum, correctNum);
  }

  // 3. Answer with trailing words vs a bare number ("4 apples" vs "4",
  //    "$7" vs "7", "12 cm" vs "12"). Only trusted when the student answer
  //    contains exactly one number — multi-number answers (e.g. coordinates
  //    or two-part answers) must match exactly instead.
  if (correctNum !== null && studentNum === null) {
    const nums = numbersIn(student);
    if (nums.length === 1 && numbersEqual(nums[0], correctNum)) return true;
  }

  return false;
}
