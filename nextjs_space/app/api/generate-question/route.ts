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
    const { yearLevel, topic, difficulty, previousQuestions } = body ?? {};

    if (!yearLevel || !topic) {
      return new Response(JSON.stringify({ error: 'Year level and topic are required' }), { status: 400 });
    }

    const diffLevel = difficulty ?? 1;
    const prevQs = previousQuestions ?? [];
    const prevContext = prevQs?.length > 0
      ? `\nPrevious questions asked (do NOT repeat these):\n${prevQs.map((q: string) => `- ${q}`).join('\n')}`
      : '';

    const shapeTopics = ['geometry', 'shapes', 'triangle', 'circle', 'rectangle', 'polygon', 'area', 'perimeter', 'volume', 'surface area', 'angles', 'quadrilateral', 'prism', 'cylinder', 'sphere', 'cone', 'cube', '3d', 'dimension', 'coordinate', 'graph', 'plot', 'trigonometry', 'trigonometric', 'sine', 'cosine', 'tangent', 'sin', 'cos', 'tan'];
    const isShapeQuestion = shapeTopics.some(t => topic.toLowerCase().includes(t));

    const figureInstructions = isShapeQuestion
      ? `
For shape/geometry topics, you MUST also include a "figureCode" field with valid SVG code:
- Create clear SVG diagrams that illustrate the question
- SVG must start with <svg viewBox="0 0 400 400" width="400" height="400" xmlns="http://www.w3.org/2000/svg"> and end with </svg>
- Use simple colors: black (#000), white (#fff), blue (#0066cc), red (#cc0000), gray (#666)
- Set stroke-width="2" for clear visible lines
- Use font-size="16" for text labels
- Add descriptive text labels for all dimensions, angles, and key measurements
- Include coordinate axes if relevant (x, y labels)
- Ensure all elements are visible and not overlapping
- Do NOT use CSS, only inline SVG attributes
- Do NOT use defs or complex SVG features, keep it simple`
      : `
For non-shape topics, omit the "figureCode" field from the response.`;

    const systemPrompt = `You are an expert Australian maths teacher creating practice questions for Year ${yearLevel} students.
The topic is: ${topic}.
Difficulty level: ${diffLevel}/5 (1=very easy, 2=easy, 3=medium, 4=hard, 5=very hard).

Rules:
- Create exactly ONE maths question appropriate for Year ${yearLevel} Australian curriculum
- The question should match the difficulty level precisely
- For difficulty 1-2: basic single-step problems
- For difficulty 3: multi-step problems requiring some reasoning  
- For difficulty 4-5: complex problems requiring multiple steps and deeper understanding
- Provide a clear, unambiguous question
- The correct answer should be specific and verifiable
- For questions involving calculations, ensure the numbers are appropriate for the year level
${prevContext}
${figureInstructions}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.
Use this exact JSON structure:
{
  "question": "The question text",
  "correctAnswer": "The correct answer",
  "workedSolution": "Step-by-step working showing how to arrive at the correct answer",
  "hint": "A helpful hint for the student",
  "difficulty": ${diffLevel},
  "maxMarks": 1${isShapeQuestion ? ',\n  "figureCode": "<svg>...</svg>"' : ''}
}`;

    const response = await fetch(process.env.LLM_API_URL as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a Year ${yearLevel} ${topic} question at difficulty level ${diffLevel}/5.` },
        ],
        stream: false,
        max_tokens: isShapeQuestion ? 2500 : 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate question from LLM API' }), { status: 500 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content ?? '';
          let finalResult: unknown;
          try {
            finalResult = JSON.parse(content);
          } catch {
            const errorData = JSON.stringify({ status: 'error', message: 'Failed to parse question JSON' });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            return;
          }
          const progressData = JSON.stringify({ status: 'processing', message: 'Generating question...' });
          controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
          const finalData = JSON.stringify({ status: 'completed', result: finalResult });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
        } catch (error) {
          console.error('LLM response error:', error);
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
    console.error('Generate question error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate question' }), { status: 500 });
  }
}
