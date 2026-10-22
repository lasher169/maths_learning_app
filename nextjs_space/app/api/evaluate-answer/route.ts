export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAnswerCorrect } from '@/lib/answer-check';

const CORRECT_FEEDBACK = [
  'Correct! Well done.',
  'That is right — great work!',
  'Perfect, you nailed it!',
  'Yes! You got it.',
];

const CORRECT_ENCOURAGEMENT = [
  'Keep up the amazing work!',
  "You're on a roll!",
  'Brilliant effort — keep going!',
  'Fantastic, you should be proud!',
];

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

interface EvaluationResult {
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
  explanation: string;
  encouragement: string;
}

function sse(controller: ReadableStreamDefaultController, encoder: TextEncoder, result: unknown) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result })}\n\n`));
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const { question, correctAnswer, studentAnswer, workingShown, yearLevel, workedSolution } = body ?? {};

    if (!question || !correctAnswer || !studentAnswer) {
      return new Response(JSON.stringify({ error: 'Question, correct answer, and student answer are required' }), { status: 400 });
    }

    const encoder = new TextEncoder();

    const sseResponse = (result: EvaluationResult) =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Evaluating...' })}\n\n`));
            sse(controller, encoder, result);
            controller.close();
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );

    // Fast path: deterministic check, no LLM round-trip.
    // Covers exact matches and numeric equivalents ("4 apples" vs "4",
    // "1/2" vs "0.5", "seven" vs "7"). Correct answers return instantly.
    if (isAnswerCorrect(studentAnswer, correctAnswer)) {
      return sseResponse({
        isCorrect: true,
        marksAwarded: 1,
        maxMarks: 1,
        feedback: workingShown
          ? 'Correct, and great working — well done!'
          : pick(CORRECT_FEEDBACK),
        explanation: workedSolution ?? '',
        encouragement: pick(CORRECT_ENCOURAGEMENT),
      });
    }

    // Slow path: answer doesn't match (or is a fuzzy equivalence the local
    // check couldn't confirm). Use the LLM to adjudicate and give tailored
    // feedback, grounded with the known worked solution.
    const systemPrompt = `You are an expert Australian maths teacher evaluating a Year ${yearLevel ?? 'unknown'} student's answer.

Question: ${question}
Correct Answer: ${correctAnswer}
${workedSolution ? `Worked Solution: ${workedSolution}` : ''}
Student's Answer: ${studentAnswer}
${workingShown ? `Student's Working: ${workingShown}` : 'No working shown.'}

Evaluate the student's answer. Be encouraging and educational.
Rules:
- "isCorrect" must be true ONLY if the student's answer is mathematically equivalent to the correct answer
- Award 1 mark if correct, 0 marks if incorrect
- If the student showed valid working but got the wrong final answer, acknowledge the good parts
- Keep the explanation appropriate for a Year ${yearLevel ?? 'unknown'} student

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.
Use this exact JSON structure:
{
  "isCorrect": true or false,
  "marksAwarded": 0 or 1,
  "maxMarks": 1,
  "feedback": "Encouraging feedback about their answer",
  "explanation": "Step-by-step explanation of the correct solution",
  "encouragement": "A short encouraging message"
}`;

    let llmResult: EvaluationResult | null = null;

    try {
      const llmCallPromise = fetch(process.env.LLM_API_URL as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Evaluate this answer and provide feedback.' },
          ],
          stream: false,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(30000),
      });

      const response = await llmCallPromise;
      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content ?? '';
        const parsed = JSON.parse(content);
        if (typeof parsed?.isCorrect === 'boolean') {
          llmResult = {
            isCorrect: parsed.isCorrect,
            marksAwarded: typeof parsed.marksAwarded === 'number' ? parsed.marksAwarded : parsed.isCorrect ? 1 : 0,
            maxMarks: 1,
            feedback: parsed.feedback ?? 'Have another look at this one.',
            explanation: parsed.explanation ?? workedSolution ?? '',
            encouragement: parsed.encouragement ?? 'Keep practising, you are doing well!',
          };
        }
      } else {
        console.error('LLM API error:', await response.text());
      }
    } catch (error) {
      console.error('LLM evaluation failed, using fallback:', error);
    }

    // Fallback when the LLM is unreachable or returned garbage: deterministic
    // incorrect result so practice never blocks on the model.
    return sseResponse(
      llmResult ?? {
        isCorrect: false,
        marksAwarded: 0,
        maxMarks: 1,
        feedback: 'Not quite — have another look at this one.',
        explanation: workedSolution ?? `The correct answer is ${correctAnswer}.`,
        encouragement: "Don't worry, mistakes help you learn. Keep going!",
      }
    );
  } catch (error: any) {
    console.error('Evaluate answer error:', error);
    return new Response(JSON.stringify({ error: 'Failed to evaluate answer' }), { status: 500 });
  }
}
