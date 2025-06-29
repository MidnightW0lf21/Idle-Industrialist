'use server';
/**
 * @fileOverview Generates flavorful news headlines for the game world.
 *
 * - generateNewsHeadline - A function that creates a news headline.
 * - NewsHeadlineInput - The input type for the generateNewsHeadline function.
 * - NewsHeadlineOutput - The return type for the generateNewsHeadline function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { SpecialEvent } from '@/types';

const NewsHeadlineInputSchema = z.object({
  playerMoney: z.number().describe("The player's current money."),
  reputation: z.number().describe("The player's reputation."),
  activeEvent: z.nativeEnum(z.enum(['RAW_MATERIAL_PRICE_CHANGE', 'PRODUCT_DEMAND_SURGE', 'GLOBAL_EFFICIENCY_BOOST', 'WORKER_STRIKE', 'SUPPLY_CHAIN_DELAY'])).nullable().describe("The type of the currently active special event, if any.")
});
export type NewsHeadlineInput = z.infer<typeof NewsHeadlineInputSchema>;

const NewsHeadlineOutputSchema = z.object({
  headline: z.string().describe("A short, catchy news headline. Max 70 characters."),
});
export type NewsHeadlineOutput = z.infer<typeof NewsHeadlineOutputSchema>;

export async function generateNewsHeadline(input: NewsHeadlineInput): Promise<NewsHeadlineOutput> {
    return generateNewsHeadlineFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateNewsHeadlinePrompt',
    input: { schema: NewsHeadlineInputSchema },
    output: { schema: NewsHeadlineOutputSchema },
    model: 'googleai/gemini-2.0-flash',
    prompt: `You are a financial news writer for "Industrial Insider", a news service in a factory simulation game. Your task is to generate a short, interesting news headline.

    The headline should be based on the player's current status and events in the game world.

    Player Status:
    - Money: {{playerMoney}}
    - Reputation: {{reputation}}
    - Active Event: {{#if activeEvent}}{{activeEvent}}{{else}}None{{/if}}

    Guidelines:
    1.  Keep headlines short and punchy (under 70 characters).
    2.  Write in the style of a business news ticker.
    3.  Generate a variety of headlines:
        - **Reactive:** Comment on the player's status (e.g., if money is high, "Idle Industrialist Inc. posts record profits!").
        - **Predictive/Hints:** Hint at potential future events (e.g., "Analysts warn of rising silicon prices," which might precede a RAW_MATERIAL_PRICE_CHANGE event for PCBs or ICs).
        - **Flavor Text:** Add world-building details (e.g., "Global shipping index ticks up 0.5%," or "Next-gen consumer electronics set to launch, driving component demand.").
        - **Event-Related:** If there is an active event, create a headline about it. For a SUPPLY_CHAIN_DELAY, "Port congestion continues to disrupt global supply chains." For a WORKER_STRIKE, "Factory union negotiations stall, impacting production."
    
    Do not mention the player by name (e.g. "player"). Refer to their company as "Idle Industrialist Inc." or more generically.
    `,
});

const generateNewsHeadlineFlow = ai.defineFlow(
    {
        name: 'generateNewsHeadlineFlow',
        inputSchema: NewsHeadlineInputSchema,
        outputSchema: NewsHeadlineOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
