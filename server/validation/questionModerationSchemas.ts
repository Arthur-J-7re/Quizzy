import { z } from "zod";

export const rejectQuestionSchema = z.object({
  reason: z.string().trim().min(1, "Un motif de refus est requis."),
});

export type RejectQuestionInput = z.infer<typeof rejectQuestionSchema>;
