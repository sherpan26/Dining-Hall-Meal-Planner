import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"
import { getGoogleModelWithRotatingKey } from "@/lib/api-key-rotation"

const NutritionalInfoSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  healthScore: z.number().min(1).max(10),
  recommendations: z.array(z.string()),
})

export async function POST(req: Request) {
  try {
    const { mealDescription } = await req.json()

    const prompt = `
      Analyze the following meal and provide nutritional information:
      
      "${mealDescription}"
      
      Provide a reasonable estimate of:
      1. Calories
      2. Protein (grams)
      3. Carbohydrates (grams)
      4. Fat (grams)
      5. Health score (1-10, where 10 is extremely healthy)
      6. A list of 2-3 recommendations to improve the nutritional value of this meal
      
      If the meal description is vague, make educated assumptions based on typical dining hall portions.
    `

    // Get the model config with a rotated API key
    const modelConfig = getGoogleModelWithRotatingKey("gemini-2.0-flash")

    const { object } = await generateObject({
      model: google(modelConfig.model, {
        apiKey: modelConfig.apiKey,
      }),
      prompt,
      schema: NutritionalInfoSchema,
    })

    return new Response(JSON.stringify(object), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in meal analysis API:", error)
    return new Response(JSON.stringify({ error: "Failed to analyze meal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

