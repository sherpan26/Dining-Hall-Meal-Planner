// Store the API keys in an array
// In production, these would come from environment variables
const API_KEYS = [
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_2 || "",
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_3 || "",
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_4 || "",
  process.env.GOOGLE_GENERATIVE_AI_API_KEY_5 || "",
].filter((key) => key.length > 0) // Filter out any empty keys

// Keep track of the last used index
let currentKeyIndex = 0

/**
 * Returns the next API key in the rotation
 * Uses a simple round-robin approach to distribute load evenly
 */
export function getNextApiKey(): string {
  // If no valid keys, return empty string (will cause error in API call)
  if (API_KEYS.length === 0) {
    console.error("No valid API keys found")
    return ""
  }

  // Get the next key
  const key = API_KEYS[currentKeyIndex]

  // Update the index for next time, wrapping around if needed
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length

  return key
}

/**
 * Returns the Google model configuration with the next API key in rotation
 */
export function getGoogleModelWithRotatingKey(modelName = "gemini-2.0-flash") {
  return {
    apiKey: getNextApiKey(),
    model: modelName,
  }
}

