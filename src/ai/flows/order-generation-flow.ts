
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
  certificationLevel: z.number().int().min(1).describe("The player's certification level. Higher levels unlock more complex and profitable orders. Level 1: Very simple orders. Level 2: Basic orders. Level 3: Intermediate orders. Level 4: Advanced orders. Level 5: Expert-level, highly complex orders."),
  reputation: z.number().int().min(0).describe("The player's reputation score. Higher reputation unlocks special, high-value contracts."),
  unlockedTechnologies: z.array(z.string()).describe("A list of technologies the player has researched, which unlock more complex products and materials. Examples: 'Advanced_Circuits', 'Photonics'.").optional()
});
export type GenerateOrderInput = z.infer<typeof GenerateOrderInputSchema>;

// Output schema for the new order
const NewOrderOutputSchema = z.object({
  productName: z.string().describe("A common electronic component. E.g., '1k Ohm Resistors', '100uF Capacitors', '5mm Red LEDs', 'ATmega328P Microcontroller'."),
  quantity: z.number().int().min(5).max(500).describe("The number of units to produce. Should be balanced based on player's capacity."),
  reward: z.number().int().min(100).describe("The total monetary reward for completing the order. Should be proportional to quantity and time."),
  timeToProduce: z.number().int().min(1).describe("The time in seconds required to produce the entire order. Production should be slow, around 3 to 12 seconds per unit (pallet). Calculate the total time based on the quantity."),
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
  isContract: z.boolean().optional().describe("Set to true if this is a special, high-value contract."),
  reputationReward: z.number().int().min(0).optional().describe("The amount of reputation awarded for completing the contract. Only include if isContract is true."),
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

  For reference, a new production line costs $10,000.

  Analyze the player's current situation:
  - Money: {{playerMoney}}
  - Production Lines: {{productionCapacity}}
  - Warehouse Usage: {{warehouseUsage}}%
  - Certification Level: {{certificationLevel}}
  - Reputation: {{reputation}}
  - Unlocked Technologies: {{#if unlockedTechnologies}}{{#each unlockedTechnologies}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}

  Based on this, create a new order that is challenging but achievable.
  - The Certification Level is the MOST IMPORTANT factor for difficulty.
  - Level 1: Generate a VERY SIMPLE and FAST order. Small quantity (5-20), low reward (e.g., 150-600), short production time (3-6s total), and only 1 simple raw material (like Resistors or LEDs) with low requirements (10-25 per pallet).
  - Level 2: Generate a basic order. Slightly larger quantity (20-50), more reward (e.g., 600-2,500), and 1-2 raw materials.
  - Level 3: Intermediate order. Larger quantity (50-150), significant reward (e.g., 2,500-10,000), and 2 more complex materials.
  - Level 4: Advanced order. Large quantity (150-300), high reward (e.g., 10,000-50,000), and 2-3 materials, including more expensive ones like PCBs or ICs.
  - Level 5: Expert order. Very large quantity (300-500), massive reward (e.g., 50,000-200,000), and 3 complex materials with high requirements per pallet.

  **Contracts:**
  - If the player's Certification Level is 3 or higher AND their reputation is above 50, you have a chance (around 20%) to generate a special **Contract** instead of a regular order.
  - Contracts are larger and more valuable than regular orders for the same certification level. They should feel like a big deal.
  - If you generate a Contract, set \`isContract: true\` and provide a \`reputationReward\` between 5 and 20 points, proportional to the contract's difficulty. Otherwise, omit these fields.

  **Unlocked Technologies:**
  - If the player has unlocked technologies, you should generate orders for more advanced products. These products should require more complex or a higher number of raw materials, have longer production times, but offer significantly higher rewards.
  - **Advanced_Circuits:** Generate orders for products like 'Multi-Layer PCBs', 'High-Frequency ICs', or 'FPGA Development Boards'. These should require a mix of basic components plus larger quantities of PCBs and Integrated Circuits.
  - **Photonics:** Generate orders for 'Fiber Optic Transceivers', 'Laser Diode Modules', or 'Photodetector Arrays'. These could require Quartz Crystals, Diodes, and Integrated Circuits.
  - **Power_Electronics:** Generate orders for 'Industrial Power Inverters', 'High-Capacity Rectifiers', or 'Switch-Mode Power Supplies'. These could require lots of Capacitors, Transistors, and Inductors.
  - If no special technologies are unlocked, stick to the component types and complexity dictated by the Certification Level.
  
  General rules:
  - If warehouse usage is high, create smaller orders for the given certification level.
  - The reward should be balanced against the quantity, production time, and material cost.
  - Use names of real-life electronic components for the product name. Be specific.
  - Production is slow. Each unit/pallet should take between 3 and 12 seconds to produce. Set the 'timeToProduce' field to the total time in seconds for the whole order based on this rate and the quantity, respecting the guidelines for each certification level.
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
