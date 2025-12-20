import { z } from 'zod'

export const platformSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  corporateName: z.string().optional(),
  defaultSplit: z.coerce
    .number()
    .min(0, 'Must be at least 0')
    .max(100, 'Cannot exceed 100'),
})

export type PlatformFormSchema = z.infer<typeof platformSchema>
