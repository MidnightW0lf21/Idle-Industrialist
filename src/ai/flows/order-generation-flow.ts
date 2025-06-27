'use server';
/**
 * @fileOverview Generates new orders for the factory.
 *
 * - generateNewOrder - A function that creates a new, creative industrial order.
 * - GenerateOrderInput - The input type for the generateNewOrder function.
 * - Order - The return type for the generateNewOrder function (re-exported from types).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Order as GameOrder } from '@/types';

// Re-export Order for convenience in the UI
export type { Order } from '@/types';

// Input schema based on game state to help the AI balance the new order
const GenerateOrderInputSchema = z.object({
  playerMoney: z.number().describe("The player's current amount of money."),
  productionCapacity: z.number().describe("The number of production lines the player has."),
  warehouseUsage: z.number().describe("The current percentage of warehouse capacity being used (0-100).")
});
export type GenerateOrderInput = z.infer<typeof GenerateOrderInputSchema>;

// Output schema for the new order
const NewOrderOutputSchema = z.object({
  productName: z.string().describe("A creative, industrial-sounding product name. E.g., 'Hyper-Sprockets', 'Quantum Girders', 'Cryo-Coolant Gel'."),
  quantity: z.number().int().min(5).max(100).describe("The number of units to produce. Should be balanced based on player's capacity."),
  reward: z.number().int().min(100).describe("The total monetary reward for completing the order. Should be proportional to quantity and time."),
  timeToProduce: z.number().int().min(5).max(60).describe("The time in seconds (ticks) required to produce the entire order on a single line."),
});


export async function generateNewOrder(input: GenerateOrderInput): Promise<Omit<GameOrder, 'id'>> {
  return generateOrderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateOrderPrompt',
  input: { schema: GenerateOrderInputSchema },
  output: { schema: NewOrderOutputSchema },
  prompt: `You are a logistics AI for a factory simulation game. Your task is to generate a new, balanced order for the player.

  Analyze the player's current situation:
  - Money: {{playerMoney}}
  - Production Lines: {{productionCapacity}}
  - Warehouse Usage: {{warehouseUsage}}%

  Based on this, create a new order that is challenging but achievable.
  - If the player has a lot of money, make the order larger and more rewarding.
  - If warehouse usage is high, create smaller orders.
  - The reward should be balanced against the quantity and production time. A longer, larger order should be worth more.
  - Be creative with the product name! It should sound like something from a futuristic industrial setting. Avoid generic names.
  `,
});

const generateOrderFlow = ai.defineFlow(
  {
    name: 'generateOrderFlow',
    inputSchema: GenerateOrderInputSchema,
    outputSchema: NewOrderOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
