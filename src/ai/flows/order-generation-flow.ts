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
  productName: z.string().describe("A common electronic component. E.g., '1k Ohm Resistors', '100uF Capacitors', '5mm Red LEDs', 'ATmega328P Microcontroller'."),
  quantity: z.number().int().min(5).max(500).describe("The number of units to produce. Should be balanced based on player's capacity."),
  reward: z.number().int().min(100).describe("The total monetary reward for completing the order. Should be proportional to quantity and time."),
  timeToProduce: z.number().int().min(1).describe("The time in seconds required to produce the entire order. Production should be slow, around 30 to 120 seconds per unit (pallet). Calculate the total time based on the quantity."),
  materialRequirements: z.record(z.string(), z.number().int().min(1)).describe("A map of raw materials required to produce ONE pallet. Keys are material names, values are quantities. Choose 1 to 3 materials from this list: Resistors, Capacitors, Transistors, LEDs, PCBs, Integrated Circuits."),
});


export async function generateNewOrder(input: GenerateOrderInput): Promise<Omit<GameOrder, 'id'>> {
  return generateOrderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateOrderPrompt',
  input: { schema: GenerateOrderInputSchema },
  output: { schema: NewOrderOutputSchema },
  model: 'googleai/gemini-2.0-flash',
  prompt: `You are a logistics AI for an electronics factory simulation game. Your task is to generate a new, balanced order for the player. The products are real-life electronic components.

  Analyze the player's current situation:
  - Money: {{playerMoney}}
  - Production Lines: {{productionCapacity}}
  - Warehouse Usage: {{warehouseUsage}}%

  Based on this, create a new order that is challenging but achievable.
  - If the player has a lot of money, make the order larger and more rewarding.
  - If warehouse usage is high, create smaller orders.
  - The reward should be balanced against the quantity and production time. A longer, larger order should be worth more.
  - Use names of real-life electronic components for the product name. Be specific, like '10k Ohm Resistors' or '2N3904 Transistors'.
  - Production is slow. Each unit/pallet should take between 30 and 120 seconds to produce. Set the 'timeToProduce' field to the total time in seconds for the whole order based on this rate and the quantity.
  - You must also specify the raw materials required to produce a single unit/pallet. The \`materialRequirements\` field should be a JSON object mapping material names to the quantity needed. Choose 1 to 3 materials and quantities that would be realistic for the product.
  - Available raw materials: Resistors, Capacitors, Transistors, LEDs, PCBs, Integrated Circuits.
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
