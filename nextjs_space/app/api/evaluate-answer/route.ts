export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const { question, correctAnswer, studentAnswer, workingShown, yearLevel, topic } = body ?? {};

    if (!question || !correctAnswer || !studentAnswer) {
      return new Response(JSON.stringify({ error: 'Question, correct answer, and student answer are required' }), { status: 400 });
    }

    const systemPrompt = `You are an expert Australian maths teacher evaluating a Year ${yearLevel ?? 'unknown'} student's answer.

Question: ${question}
Correct Answer: ${correctAnswer}
Student's Answer: ${studentAnswer}
${workingShown ? `Student's Working: ${workingShown}` : 'No working shown.'}

Evaluate the student's answer. Be encouraging and educational.
Rules:
- Award 1 mark if the answer is correct (or close enough with valid reasoning)
- Award 0 marks if the answer is incorrect
- If the student showed valid working but got the wrong final answer, acknowledge the good parts
- Provide a clear, step-by-step explanation of how to solve the problem
- Be encouraging and supportive regardless of whether they got it right or wrong
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

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Evaluate this answer and provide feedback.' },
        ],
        stream: true,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('LLM API error:', await response.text());
      return new Response(JSON.stringify({ error: 'Failed to evaluate answer' }), { status: 500 });
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body from LLM' }), { status: 500 });
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        let partialRead = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                   try {
                     const finalResult = JSON.parse(buffer);
                     const finalData = JSON.stringify({ status: 'completed', result: finalResult });
                     controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                   } catch (e) {
                     const errorData = JSON.stringify({ status: 'error', message: 'Failed to parse evaluation' });
                     controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                   }
                   return;
                }
                try {
                  const parsed = JSON.parse(data);
                  buffer += parsed?.choices?.[0]?.delta?.content ?? '';
                  const progressData = JSON.stringify({ status: 'processing', message: 'Evaluating...' });
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
                } catch (e) {
                  // skip
                }
              }
            }
          }
          if (buffer) {
            try {
              const finalResult = JSON.parse(buffer);
              const finalData = JSON.stringify({ status: 'completed', result: finalResult });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            } catch (e) {
              const errorData = JSON.stringify({ status: 'error', message: 'Failed to parse evaluation' });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          const errorData = JSON.stringify({ status: 'error', message: 'Stream processing error' });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Evaluate answer error:', error);
    return new Response(JSON.stringify({ error: 'Failed to evaluate answer' }), { status: 500 });
  }
}
