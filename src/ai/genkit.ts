import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const google = googleAI();

export const ai = genkit({
  plugins: [google],
});
