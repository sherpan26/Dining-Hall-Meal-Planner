import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { getGoogleModelWithRotatingKey } from "@/lib/api-key-rotation"

export async function POST(req: Request) {
  try {
    const { messages, menuSummary } = await req.json()

    console.log(`Chat API request received with ${messages.length} messages`)

    // Get the model config with a rotated API key
    const modelConfig = getGoogleModelWithRotatingKey("gemini-2.0-flash")

    // Log the API key being used (first few characters only for security)
    const apiKeyPreview =
      modelConfig.apiKey.substring(0, 4) + "..." + modelConfig.apiKey.substring(modelConfig.apiKey.length - 4)
    console.log(`Using API key: ${apiKeyPreview}, model: ${modelConfig.model}`)

    // Get the user message
    const userMessage = messages[messages.length - 1].content
    console.log(`Last user message: "${userMessage}"`)

    // Add system message if not already present
    let finalMessages = [...messages]
    if (messages[0]?.role !== "system") {
      let processedMenuSummary = menuSummary
      console.log(`Menu summary length: ${menuSummary ? menuSummary.length : 0} characters`)

      // Truncate menu summary if it's too large to prevent API issues
      if (menuSummary && menuSummary.length > 8000) {
        console.log("Menu summary is too large, truncating...")

        // Extract just the most important parts - keep the structure but limit items per category
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

          // Limit items per category to 5
          if (line.startsWith("-") && itemsInCategory < 5) {
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
        console.log(`Truncated menu summary to ${processedMenuSummary.length} characters`)
      }

      // Update the system message to reflect that we're not sending nutrition info
      const systemMessage = {
        role: "system",
        content: `You are a helpful Rutgers Dining AI assistant. You provide personalized recommendations based on the dining hall menus.
${
  processedMenuSummary
    ? `Here is the current menu information:
${processedMenuSummary}`
    : "No menu data is currently available."
}

When making recommendations:
1. ALWAYS provide EXACTLY 3 meal options that match the user's preferences
2. Offer balanced meal combinations
3. Be helpful, concise, and friendly

FORMAT YOUR RESPONSES CLEARLY:
- Use "**Option 1: [Name]**", "**Option 2: [Name]**", and "**Option 3: [Name]**" for the three meal options
- For each food item, use the format "**[Food Item]**" (with double asterisks)
- List each food item on a NEW LINE with double asterisks, like:
  "**Turkey Breast** (Calories: 120, Protein: 24g, Carbs: 0g, Fat: 3g)
  **Swiss Cheese** (Calories: 80, Protein: 8g, Carbs: 1g, Fat: 6g)
  **Lettuce** (Calories: 5, Protein: 0g, Carbs: 1g, Fat: 0g)"
- IMPORTANT: Include estimated nutrition information for EACH individual food item in parentheses after the item name
- For each meal option, also include a meal total with format: "Total: Calories: X, Protein: Xg, Carbs: Xg, Fat: Xg"
- Use proper spacing and line breaks between items for readability

If the user asks about items not on the menu, politely explain that you can only provide information about the current menu.

IMPORTANT: Format your response with each food item on its own line with double asterisks and include nutrition info for EACH item.`,
      }
      finalMessages = [systemMessage, ...messages]
    }

    console.log(`System message added. Final message count: ${finalMessages.length}`)
    console.log(`Menu summary length: ${menuSummary ? menuSummary.length : 0} characters`)

    try {
      // First try: Use the standard approach with generateText
      console.log("Attempting standard generateText approach...")

      // Use generateText instead of streaming
      const { text } = await generateText({
        model: google(modelConfig.model, {
          apiKey: modelConfig.apiKey,
        }),
        messages: finalMessages,
        maxTokens: 800,
        temperature: 0.7,
      })

      console.log("Generated text successfully:", text.substring(0, 100) + "...")

      // Convert the generated text to a stream
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text })}

`),
          )
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } catch (error) {
      console.error("Error with generateText:", error)

      // Fallback to a simpler approach
      console.log("Attempting fallback with simplified prompt...")
      try {
        let processedMenuSummary = menuSummary
        if (menuSummary && menuSummary.length > 8000) {
          console.log("Menu summary is too large, truncating...")

          // Extract just the most important parts - keep the structure but limit items per category
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

            // Limit items per category to 5
            if (line.startsWith("-") && itemsInCategory < 5) {
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
          console.log(`Truncated menu summary to ${processedMenuSummary.length} characters`)
        }
        const { text } = await generateText({
          model: google(modelConfig.model, {
            apiKey: modelConfig.apiKey,
          }),
          prompt: `Based on this menu: ${processedMenuSummary}

User question: ${userMessage}

Provide a helpful response about the menu items. 

FORMAT YOUR RESPONSE:
- Use "**Option 1: [Name]**" for each meal option
- List each food item on a NEW LINE with double asterisks, like:
  "**Turkey Breast** (Calories: 120, Protein: 24g, Carbs: 0g, Fat: 3g)
  **Swiss Cheese** (Calories: 80, Protein: 8g, Carbs: 1g, Fat: 6g)"
- IMPORTANT: Include estimated nutrition information for EACH individual food item in parentheses
- For each meal option, also include a meal total
- Use proper spacing and line breaks between items for readability`,
          maxTokens: 500,
          temperature: 0.7,
        })

        console.log("Fallback generated text successfully:", text.substring(0, 100) + "...")

        // Convert the generated text to a stream
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}

`),
            )
            controller.close()
          },
        })

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        })
      } catch (fallbackError) {
        console.error("Error with fallback:", fallbackError)

        // Return a simple hardcoded response as a last resort
        const fallbackResponse = {
          text: "I'm having trouble processing your request right now. Could you try asking a more specific question about the menu items?",
        }

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(fallbackResponse)}

`),
            )
            controller.close()
          },
        })

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        })
      }
    }
  } catch (error) {
    console.error("Chat API error:", error)
    console.error(`Chat API error details:`, error)
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

