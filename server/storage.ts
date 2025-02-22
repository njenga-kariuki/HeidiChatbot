import { messages, type Message, type InsertMessage } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createMessage(message: InsertMessage): Promise<Message>;
  getMessage(id: number): Promise<Message | undefined>;
  updateMessage(id: number, updates: Partial<Message>): Promise<Message>;
  getLatestMessages(limit: number): Promise<Message[]>;
  getAllMessages(): Promise<Message[]>;
}

export class DatabaseStorage implements IStorage {
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    return message;
  }

  async updateMessage(id: number, updates: Partial<Message>): Promise<Message> {
    // Validate that we have actual updates to perform
    const validUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(validUpdates).length === 0) {
      throw new Error('No valid updates provided');
    }

    const [message] = await db
      .update(messages)
      .set(validUpdates)
      .where(eq(messages.id, id))
      .returning();

    if (!message) {
      throw new Error(`Message ${id} not found`);
    }

    return message;
  }

  async getLatestMessages(limit: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async getAllMessages(): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .orderBy(desc(messages.createdAt));
  }
}

export const storage = new DatabaseStorage();