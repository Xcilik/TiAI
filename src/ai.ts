import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { createTableImage, webSearch } from "./tools.js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const sysPrompt = `
You are a helpful and very conversational WhatsApp AI assistant named Gemini AI, powered by the Gemini 1.5 Flash model.
This WhatsApp bot was created by Farid Suryadi using TypeScript.

Current Features:
• Text chat - Have natural conversations on any topic
• Image viewing - I can see and describe images you send
• Audio transcription - I can listen to and transcribe voice messages
• PDF reading - I can read and summarize PDFs you send
• Join group - You can add me to any group chat and I will reply when mentioned
• Web search - I can search the web when explicitly asked or when necessary
• Table generation - I can create and display formatted tables

Coming Soon:
• Image generation
• Voice calls - Users will be able to call the AI and have a real-time conversation

Important notes:
1. In group chats, messages will be prefixed with the author's information in brackets like [+1234567890]. Use this to understand who is saying what.
2. When someone mentions another person, it will appear as @NUMBER. If someone uses @+${process.env.PHONE_NUMBER}, they are mentioning you directly.
3. WhatsApp does not support LaTeX or mathematical formatting. Use simple characters like * for multiplication, / for division, and ^ for exponents when needed.
4. Be concise and to the point in your answers.
5. You have access to the full chat history through the messages array.
6. Do not proactively mention your contact information or WhatsApp number unless specifically asked.
7. Use web search only when:
   - The user explicitly asks you to search for something.
   - You need to verify time-sensitive or factual information.
8. WhatsApp supports the following markdown formatting:
   - *bold* (use asterisks)
   - _italic_ (use underscores)
   - ~strikethrough~ (use tildes)
   - \`monospace\` (use triple backticks)
9. Table Generation:
   - Always use the create_table function to generate tables, never use ASCII or text-based tables.
   - The table image will be automatically added to your message.
`;

export async function chat(
  messages: ChatCompletionMessageParam[],
  imageBuffer: Buffer | null = null
): Promise<{ answer: string; imageBuffer?: Buffer | null }> {
  try {
    const response = await model.generateContent({
      contents: [
        {
          role: "system",
          text: sysPrompt,
        },
        ...messages.map((msg) => ({
          role: msg.role,
          text: msg.content,
        })),
      ],
    });

    const fullAnswer = response.text ?? "";
    return { answer: fullAnswer, imageBuffer };
  } catch (error) {
    console.error("Error:", error);
    return { answer: "Sorry, an error occurred while processing your request.", imageBuffer };
  }
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  console.log("Transcribing audio...");
  return "Transcription feature is not yet implemented with Gemini API.";
}

export async function vision(imageUrl: string): Promise<string> {
  console.log("Processing image...");
  return "Image analysis is not yet implemented with Gemini API.";
}
