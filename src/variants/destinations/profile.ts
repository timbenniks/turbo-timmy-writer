import { z } from "zod";

import { variantDestinations } from "../model";

export const destinationProfileSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/).max(100),
  version: z.string().regex(/^v[1-9][0-9]*$/),
  destination: z.enum(variantDestinations),
  name: z.string().trim().min(1).max(100),
  instructions: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
});

export type DestinationProfile = z.infer<typeof destinationProfileSchema>;
