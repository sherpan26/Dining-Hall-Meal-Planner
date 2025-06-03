import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { getGoogleModelWithRotatingKey } from "@/lib/api-key-rotation"

export async function POST(req: Request) {
  try {
    const { message, menuSummary } = await req.json()

    console.log(`Direct chat API request received with message: "${message.substring(0, 50)}..."`)
    console.log(`Menu summary length: ${menuSummary ? menuSummary.length : 0} characters`)

    // Add truncation logic for large menu summaries
    let processedMenuSummary = menuSummary
    if (menuSummary && menuSummary.length > 8000) {
      console.log("Menu summary is too large for direct API, truncating...")

      // Extract just the most important parts
      const lines = menuSummary.split("\n")
      const truncatedLines = []
      let currentCategory = ""
      let itemsInCategory = 0

      for (const line of lines) {
        // Always keep category headers
        if (line.endsWith(":") && !line.startsWith("-")) {
          currentCategory = line
          truncatedLines.push(line)
          itemsInCategory = 0
          continue
        }

        // Limit items per category to 3 (even more aggressive truncation for direct API)
        if (line.startsWith("-") && itemsInCategory < 3) {
          truncatedLines.push(line)
          itemsInCategory++
          continue
        }

        // Keep empty lines and other formatting
        if (line.trim() === "") {
          truncatedLines.push(line)
        }
      }

      processedMenuSummary = truncatedLines.join("\n")
      console.log(`Truncated menu summary to ${processedMenuSummary.length} characters for direct API`)
    }

    // Get the model config with a rotated API key
    const modelConfig = getGoogleModelWithRotatingKey("gemini-2.0-flash")

    try {
      // Update the prompt to request 3 options with bullet points
      const { text } = await generateText({
        model: google(modelConfig.model, {
          apiKey: modelConfig.apiKey,
        }),
        prompt: `You are a helpful Rutgers Dining AI assistant. 

Here is the current menu:
${processedMenuSummary}

User question: ${message}

Provide a helpful response about the menu items.

FORMAT YOUR RESPONSE:
- Start with a brief introduction to your recommendations
- ALWAYS provide EXACTLY 3 meal options
- Use "**Option 1: [Name]**", "**Option 2: [Name]**", and "**Option 3: [Name]**" for the three meal options
- For each food item, use the format "**[Food Item]**" (with double asterisks)
- List each food item on a NEW LINE with double asterisks, like:
  "**Turkey Breast** (Calories: 120, Protein: 24g, Carbs: 0g, Fat: 3g)
  **Swiss Cheese** (Calories: 80, Protein: 8g, Carbs: 1g, Fat: 6g)
  **Lettuce** (Calories: 5, Protein: 0g, Carbs: 1g, Fat: 0g)"
- IMPORTANT: Include estimated nutrition information for EACH individual food item in parentheses after the item name
- For each meal option, also include a meal total with format: "Total: Calories: X, Protein: Xg, Carbs: Xg, Fat: Xg"
- End with a brief conclusion or suggestion`,
        maxTokens: 500,
        temperature: 0.7,
      })

      console.log("Direct API generated text successfully:", text.substring(0, 100) + "...")

      return new Response(JSON.stringify({ text }), {
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      console.error("Error with direct API:", error)

      // Return a simple hardcoded response as a last resort
      return new Response(
        JSON.stringify({
          text: "I'm having trouble processing your request right now. Could you try asking a more specific question about the menu items?",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("Direct chat API error:", error)
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

