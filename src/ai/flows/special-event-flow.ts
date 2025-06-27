'use server';
/**
 * @fileOverview Generates random special events for the factory game.
 *
 * - generateSpecialEvent - A function that creates a new random event.
 * - SpecialEventInput - The input type for the generateSpecialEvent function.
 * - SpecialEventData - The return type for the generateSpecialEvent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SpecialEventInputSchema = z.object({
  playerMoney: z.number().describe("The player's current money."),
  reputation: z.number().describe("The player's reputation."),
  productionLines: z.number().describe("The number of production lines the player has."),
});
export type SpecialEventInput = z.infer<typeof SpecialEventInputSchema>;

const SpecialEventOutputSchema = z.object({
  name: z.string().describe("A catchy name for the event, like 'Market Boom' or 'Union Strike'."),
  description: z.string().describe("A one-sentence description of the event and its effect."),
  type: z.enum(['RAW_MATERIAL_PRICE_CHANGE', 'PRODUCT_DEMAND_SURGE', 'GLOBAL_EFFICIENCY_BOOST', 'WORKER_STRIKE', 'SUPPLY_CHAIN_DELAY']).describe("The type of event."),
  duration: z.number().int().min(60).max(300).describe("The duration of the event in seconds."),
  // Effect-specific fields
  targetItem: z.string().optional().describe("The name of the raw material or product affected by the event. Required for price/demand changes. Should be one of: 'Resistors', 'Capacitors', 'Transistors', 'LEDs', 'PCBs', 'Integrated Circuits', 'Diodes', 'Inductors', 'Quartz Crystals', 'Switches'."),
  priceMultiplier: z.number().optional().describe("The multiplier for the item's cost or value (e.g., 2.0 for double price, 0.5 for half price)."),
  efficiencyBoost: z.number().optional().describe("The temporary efficiency multiplier for all production lines (e.g., 1.2 for a 20% boost)."),
  strikeDemand: z.number().int().optional().describe("The amount of money demanded by striking workers to end the strike."),
  delayTime: z.number().int().optional().describe("The number of additional seconds all new deliveries will be delayed by."),
});
export type SpecialEventData = z.infer<typeof SpecialEventOutputSchema>;

export async function generateSpecialEvent(input: SpecialEventInput): Promise<SpecialEventData> {
    return generateEventFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateEventPrompt',
    input: { schema: SpecialEventInputSchema },
    output: { schema: SpecialEventOutputSchema },
    model: 'googleai/gemini-2.0-flash',
    prompt: `You are a game master for an electronics factory simulation game. Your task is to generate an interesting random event to challenge the player.

    Analyze the player's current situation:
    - Money: {{playerMoney}}
    - Reputation: {{reputation}}
    - Production Lines: {{productionLines}}
    
    Based on this, generate a special event. The event should be plausible for an industrial setting. Don't always make them negative. Sometimes, create a positive event. Choose a product or material from the provided list.
    
    Event Types:
    - RAW_MATERIAL_PRICE_CHANGE: The cost of one specific raw material changes. 'priceMultiplier' can be high (e.g., 1.5-3.0) for a shortage or low (e.g., 0.5-0.7) for a surplus.
    - PRODUCT_DEMAND_SURGE: The sale value of a finished product the player can make suddenly increases. Choose a plausible product name based on electronics components (e.g., "100uF Capacitors"). The 'priceMultiplier' should be high (1.5-2.5). This is a positive event.
    - GLOBAL_EFFICIENCY_BOOST: A technological breakthrough or new management technique provides a temporary boost to all production. 'efficiencyBoost' should be between 1.2 and 1.8. This is a positive event.
    - WORKER_STRIKE: The workers demand better pay. All production halts until the 'strikeDemand' is paid. This is a negative event. Make the demand significant but not game-ending, based on the player's money.
    - SUPPLY_CHAIN_DELAY: Global shipping problems cause all incoming raw material deliveries to be delayed. 'delayTime' should be between 60 and 180 seconds. This is a negative event.
    
    Choose an event type and fill in the required fields. Ensure the 'description' clearly explains the effect to the player.
    `,
});

const generateEventFlow = ai.defineFlow(
    {
        name: 'generateEventFlow',
        inputSchema: SpecialEventInputSchema,
        outputSchema: SpecialEventOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
