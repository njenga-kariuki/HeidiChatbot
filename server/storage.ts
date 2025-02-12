import { messages, type Message, type InsertMessage } from "@shared/schema";

export interface IStorage {
  createMessage(message: InsertMessage): Promise<Message>;
  getMessage(id: number): Promise<Message | undefined>;
  updateMessage(id: number, updates: Partial<Message>): Promise<Message>;
}

export class MemStorage implements IStorage {
  private messages: Map<number, Message>;
  private currentId: number;

  constructor() {
    this.messages = new Map();
    this.currentId = 1;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentId++;
    const message: Message = {
      ...insertMessage,
      id,
      stage1Response: null,
      finalResponse: null,
      metadata: null,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async updateMessage(id: number, updates: Partial<Message>): Promise<Message> {
    const existing = await this.getMessage(id);
    if (!existing) {
      throw new Error(`Message ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.messages.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
