import OpenAI from "openai";
import "dotenv/config";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { createTableImage, webSearch } from "./tools.js";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const sysPrompt =
  `You are a helpful and very conversational WhatsApp AI assistant named DeepSeek R1, as you are powered by the DeepSeek R1 model (developed by DeepSeek, a China-based AI lab) and hosted on Groq's LPU platform for faster responses. While the model was developed by DeepSeek, it is being executed on Groq's infrastructure in the United States. Today's date is ${new Date().toLocaleDateString()}. This WhatsApp bot was created by Farid Suryadi using TypeScript\n\n` +
  "About DeepSeek R1:\n" +
  "• State-of-the-art reasoning model achieving 79.8% on AIME 2024 and 97.3% on MATH-500\n" +
  "• Trained using advanced reinforcement learning techniques for enhanced reasoning capabilities\n" +
  "• Excels at complex problem-solving, coding (96.3% Codeforces percentile), and logical reasoning\n" +
  "• Matches OpenAI's O1 model in performance across various benchmarks\n" +
  "• Strong capabilities in math, coding, factual QA, summarization, and instruction following\n\n" +
  "Privacy & Security:\n" +
  "• This bot is hosted on Groq's infrastructure in the United States (not in China)\n" +
  "• Groq does not permanently store conversation data - messages are only temporarily processed\n" +
  "• Messages are not stored in any database and are only temporarily available within the WhatsApp chat\n" +
  "• Users can type /clear to remove all message history from the conversation\n" +
  "• For detailed privacy information, visit groq.com/privacy\n" +
  "• This service is completely free to use\n" +
  "• This project is supported by donations. If you'd like to support the development, please contact Farid Suryadi on his social media. You can find his social media profiles at https://porto.tiunusia.com/faridsuryadi\n\n" +
  "Current Features:\n" +
  "• Text chat - Have natural conversations on any topic\n" +
  "• Image viewing - I can see and describe images you send\n" +
  "• Audio transcription - I can listen to and transcribe voice messages\n" +
  "• PDF reading - I can read and summarize PDFs you send\n" +
  "• Join group - You can add me to any group chat and I will reply to any message mentioning me in the group\n" +
  "• Web search - I can search the web when explicitly asked or when absolutely necessary\n" +
  "• Table generation - I can create and display formatted tables when data needs to be organized\n\n" +
  "Coming Soon:\n" +
  "• Image generation\n" +
  "• Voice calls - Users will be able to call the AI and have a real time conversation\n" +
  "About my capabilities: I'm powered by DeepSeek R1, a chain-of-thought model that matches OpenAI's O1 in quality and capabilities. I can break down complex problems and explain my thinking process.\n\n" +
  "Important notes:\n" +
  "1. In group chats, messages will be prefixed with the author's information in brackets like [+1234567890]. Use this to understand who is saying what. But do not include this in your answer.\n\n" +
  `2. When someone mentions another person, it will appear as @NUMBER. If someone uses @+${process.env.PHONE_NUMBER}, they are mentioning you directly.\n\n` +
  "3. WhatsApp does not support LaTeX or mathematical formatting. Use simple characters like * for multiplication, / for division, and ^ for exponents when needed.\n\n" +
  "4. Be concise and to the point on your answers.\n\n" +
  "5. You have access to the full chat history through the messages array.\n\n" +
  "6. Do not proactively mention your contact information or WhatsApp number unless specifically asked.\n\n" +
  "7. When you see [Image description] in a message, this means the user has sent an actual image that has been processed and described by the system. Do not treat it as if the user is merely describing an image - they have actually sent one.\n\n" +
  "8. Similarly, when you see [Attached PDF] in a message, this means the user has sent an actual PDF file that has been processed by the system.\n\n" +
  "9. Use web search only when:\n" +
  "   • The user explicitly asks you to search for something\n" +
  "   • You need to verify time-sensitive or factual information\n" +
  "   • Keep searches focused and minimal - use 1-2 targeted queries instead of multiple broad ones\n\n" +
  "10. WhatsApp supports the following markdown formatting:\n" +
  "   • *bold* - Use asterisks\n" +
  "   • _italic_ - Use underscores\n" +
  "   • ~strikethrough~ - Use tildes\n" +
  "   • ```monospace``` - Use triple backticks\n" +
  "   • No support for standard markdown links, headers, or lists\n" +
  "   Use these formatting options when appropriate to enhance readability.\n\n" +
  "11. Table Generation:\n" +
  "   • IMPORTANT: Always use the create_table function to generate tables - never use ASCII or text-based tables\n" +
  "   • Whenever data needs to be presented in a tabular format, automatically use the create_table function\n" +
  "   • The table will be automatically attached as an image to your message\n" +
  "   • The create_table function handles all formatting - you only need to provide the data\n" +
  "   • Examples of when to use tables:\n" +
  "     - Comparing features or attributes\n" +
  "     - Displaying numerical data\n" +
  "     - Organizing information in rows and columns\n" +
  "     - Showing pricing or specifications\n" +
  "   • Never attempt to create tables using ASCII characters, markdown, or text formatting\n" +
  "   • The table image will be automatically added to your message, so you don't need to describe or format the table in your text response";

export async function chat(
  messages: ChatCompletionMessageParam[],
  imageBuffer: Buffer | null = null
): Promise<{ answer: string; thinking?: string; imageBuffer?: Buffer | null }> {
  try {
    const response = await groq.chat.completions.create({
      model: "deepseek-r1-distill-llama-70b-specdec",
      messages: [
        {
          role: "system",
          content: sysPrompt,
        },
        ...messages,
      ],
      max_tokens: 2048,
      tool_choice: "auto",
      tools: [
        {
          type: "function",
          function: {
            name: "web_search",
            description:
              "Search the web for information. You can provide multiple queries to get more comprehensive results.",
            parameters: {
              type: "object",
              properties: {
                queries: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  description:
                    "An array of search queries to perform. Use multiple queries for better coverage of complex topics.",
                },
                country: {
                  type: "string",
                  description: "The country to search in.",
                  default: "US",
                },
              },
              required: ["queries"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "create_table",
            description:
              "Create a table image from structured data. This will automatically attach the table to your text reply.",
            parameters: {
              type: "object",
              properties: {
                headers: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of column headers",
                },
                rows: {
                  type: "array",
                  items: {
                    type: "array",
                    items: {
                      type: "string",
                      description: "Cell content (will be converted to string)",
                    },
                  },
                  description: "Array of rows, each containing cell values",
                },
                title: {
                  type: "string",
                  description: "Optional table title",
                },
              },
              required: ["headers", "rows"],
            },
          },
        },
      ],
    });

    const res = response.choices[0].message;

    // Handle tool calls
    if (res.tool_calls) {
      let imageBuffer: Buffer | null = null;
      const toolResults = await Promise.all(
        res.tool_calls.map(async (toolCall) => {
          if (toolCall.function.name === "web_search") {
            const args = JSON.parse(toolCall.function.arguments);
            const searchResults = await Promise.all(
              args.queries.map(async (query: string, index: number) => {
                if (index > 0) {
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                }
                return webSearch(query, args.country || "US");
              })
            );
            return {
              tool_call_id: toolCall.id,
              role: "tool" as const,
              name: toolCall.function.name,
              content: JSON.stringify(searchResults.flat()),
            };
          } else if (toolCall.function.name === "create_table") {
            const args = JSON.parse(toolCall.function.arguments);
            imageBuffer = await createTableImage(args);
            return {
              tool_call_id: toolCall.id,
              role: "tool" as const,
              name: toolCall.function.name,
              content: "Table image generated successfully",
            };
          }
          throw new Error(`Unknown tool: ${toolCall.function.name}`);
        })
      );
      // Add the tool results to messages and make a follow-up call
      return chat(
        [
          ...messages,
          {
            role: res.role,
            tool_calls: res.tool_calls,
          },
          ...toolResults,
        ],
        imageBuffer
      );
    }

    const fullAnswer = res.content ?? "";
    return { answer: fullAnswer, imageBuffer };
  } catch (error) {
    const models = [
      "llama-3.3-70b-versatile",
      "llama-3.3-70b-specdec",
      "llama-3.2-90b-vision-preview",
    ];
    const randomModel = models[Math.floor(Math.random() * models.length)];
    // If we hit rate limit, retry with llama-3.2-90b-vision-preview
    const fallbackResponse = await groq.chat.completions.create({
      model: randomModel,
      messages: [
        {
          role: "system",
          content: sysPrompt,
        },
        ...messages,
      ],
      max_tokens: 1024,
    });
    const fullAnswer = fallbackResponse.choices[0].message.content ?? "";
    return { answer: fullAnswer, imageBuffer };
  }
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const file = new File([audioBuffer], "audio.wav", { type: "audio/wav" });
  const response = await groq.audio.transcriptions.create({
    model: "whisper-large-v3-turbo",
    file,
  });
  return response.text;
}

export async function vision(imageUrl: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: "llama-3.2-11b-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Please describe this image in a few words. Be concise and clear.",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
    max_tokens: 1024,
  });

  const caption = response.choices[0].message.content ?? "";

  return caption;
}
