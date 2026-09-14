import { z } from "zod";

// Zod schema for runtime validation
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  timestamp: z.date().default(() => new Date()),
});

export type Message = z.infer<typeof MessageSchema>;

export interface ChatSession {
  sessionId: string;
  messages: Message[];
  isLoading: boolean;
}