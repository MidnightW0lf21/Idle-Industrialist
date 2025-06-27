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
  warehouseUsage: z.number().describe("The current percentage of warehouse capacity being used (0-100)."),
  certificationLevel: z.number().int().min(1).describe("The player's certification level. Higher levels unlock more complex and profitable orders. Level 1: Very simple orders. Level 2: Basic orders. Level 3: Intermediate orders. Level 4: Advanced orders. Level 5: Expert-level, highly complex orders.")
});
export type GenerateOrderInput = z.infer<typeof GenerateOrderInputSchema>;

// Output schema for the new order
const NewOrderOutputSchema = z.object({
  productName: z.string().describe("A common electronic component. E.g., '1k Ohm Resistors', '100uF Capacitors', '5mm Red LEDs', 'ATmega328P Microcontroller'."),
  quantity: z.number().int().min(5).max(500).describe("The number of units to produce. Should be balanced based on player's capacity."),
  reward: z.number().int().min(100).describe("The total monetary reward for completing the order. Should be proportional to quantity and time."),
  timeToProduce: z.number().int().min(1).describe("The time in seconds required to produce the entire order. Production should be slow, around 30 to 120 seconds per unit (pallet). Calculate the total time based on the quantity."),
  materialRequirements: z.object({
    'Resistors': z.number().int().min(1).optional(),
    'Capacitors': z.number().int().min(1).optional(),
    'Transistors': z.number().int().min(1).optional(),
    'LEDs': z.number().int().min(1).optional(),
    'PCBs': z.number().int().min(1).optional(),
    'Integrated Circuits': z.number().int().min(1).optional(),
    'Diodes': z.number().int().min(1).optional(),
    'Inductors': z.number().int().min(1).optional(),
    'Quartz Crystals': z.number().int().min(1).optional(),
    'Switches': z.number().int().min(1).optional(),
  }).describe("An object listing the raw materials required to produce ONE pallet. Only include keys for materials that are actually required. Choose 1 to 3 materials. The quantities for each material per pallet should be substantial, ranging from 25 to 100 units."),
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
  - Certification Level: {{certificationLevel}}

  Based on this, create a new order that is challenging but achievable.
  - The Certification Level is the MOST IMPORTANT factor for difficulty.
  - Level 1: Generate a VERY SIMPLE and FAST order. Small quantity (5-20), low reward, short production time (30-60s total), and only 1 simple raw material (like Resistors or LEDs) with low requirements (10-25 per pallet).
  - Level 2: Generate a basic order. Slightly larger quantity (20-50), more reward, and 1-2 raw materials.
  - Level 3: Intermediate order. Larger quantity (50-150), significant reward, and 2 more complex materials.
  - Level 4: Advanced order. Large quantity (150-300), high reward, and 2-3 materials, including more expensive ones like PCBs or ICs.
  - Level 5: Expert order. Very large quantity (300-500), massive reward, and 3 complex materials with high requirements per pallet.
  
  General rules:
  - If warehouse usage is high, create smaller orders for the given certification level.
  - The reward should be balanced against the quantity, production time, and material cost.
  - Use names of real-life electronic components for the product name. Be specific.
  - Production is slow. Each unit/pallet should take between 30 and 120 seconds to produce. Set the 'timeToProduce' field to the total time in seconds for the whole order based on this rate and the quantity, respecting the guidelines for each certification level.
  - You must specify the raw materials required to produce a single unit/pallet. The \`materialRequirements\` field should be a JSON object mapping material names to the quantity needed. Choose materials appropriate for the certification level. The quantities for each material per pallet should be substantial, ranging from 25 to 100 units, reflecting a complex assembly.
  - Available raw materials: Resistors, Capacitors, Transistors, LEDs, PCBs, Integrated Circuits, Diodes, Inductors, Quartz Crystals, Switches.
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
