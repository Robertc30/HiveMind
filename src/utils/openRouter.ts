import { z } from 'zod';
import { Message, ChatMessage, OpenRouterResponse } from '../types';

const SYSTEM_PROMPT = "You are a helpful and friendly assistant in a collaborative chatroom. Multiple users may be participating. Your responses should be concise, helpful, and encourage collaboration. If a user asks a question, provide a clear and concise answer. If a user makes a statement, offer a relevant and helpful response. Always be respectful and avoid making assumptions.";

const openRouterResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});

function validateApiKey() {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured');
  }
  return apiKey;
}

function formatMessages(messages: Message[]): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map(msg => ({
      role: msg.user === 'GPT' ? 'assistant' : (msg.user === 'system' ? 'system' : 'user'),
      content: `${msg.user}: ${msg.content}`
    }))
  ];
}

export async function getGPTResponse(messages: Message[]): Promise<string> {
  try {
    const apiKey = validateApiKey();
    const formattedMessages = formatMessages(messages);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1000,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const validatedData = openRouterResponseSchema.parse(data);
    
    return validatedData.choices[0].message.content;
  } catch (error) {
    console.error('Error getting GPT response:', error);
    if (error instanceof z.ZodError) {
      return "I received an invalid response format. Please try again.";
    }
    if (error instanceof Error) {
      return `I apologize, but I'm having trouble responding right now: ${error.message}`;
    }
    return "I apologize, but I'm having trouble responding right now. Please try again later.";
  }
}
