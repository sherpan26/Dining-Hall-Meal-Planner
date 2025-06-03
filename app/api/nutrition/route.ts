import { NextResponse } from "next/server"

interface NutritionData {
  itemName: string
  servingSize: string
  calories: string
  totalFat: string
  saturatedFat: string
  transFat: string
  cholesterol: string
  sodium: string
  totalCarbs: string
  dietaryFiber: string
  sugars: string
  protein: string
  ingredients: string
  allergens: string
  percentDailyValues: Record<string, string>
}

export async function POST(req: Request) {
  try {
    const { nutritionLink } = await req.json()

    if (!nutritionLink) {
      return NextResponse.json({ error: "Nutrition link is required" }, { status: 400 })
    }

    const response = await fetch(nutritionLink, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const html = await response.text()

    // Parse the nutrition information from the HTML
    const nutritionData = parseNutritionInfo(html)

    return NextResponse.json(nutritionData)
  } catch (error) {
    console.error("Error in nutrition API:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "An error occurred" }, { status: 500 })
  }
}

// Update the parseNutritionInfo function to better extract percentage values

function parseNutritionInfo(html: string): NutritionData {
  // Extract item name - look for h2 tag with the item name
  const itemNameMatch = html.match(/<h2>([\s\S]*?)<\/h2>/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const itemName = itemNameMatch ? itemNameMatch[1].trim() : "Unknown Item"

  // Extract serving size - look for "Serving Size" text
  const servingSizeMatch = html.match(/Serving Size\s*([\s\S]*?)<\/p>/i)
  const servingSize = servingSizeMatch ? servingSizeMatch[1].trim() : "1 EACH"

  // Extract calories - look for "Calories" text
  const caloriesMatch = html.match(/Calories&nbsp;(\d+)/i) || html.match(/Calories[^<]*?(\d+)/i)
  const calories = caloriesMatch ? caloriesMatch[1].trim() : "0"

  // Extract nutrition facts from the table
  // Look for the specific table structure in the HTML
  const totalFatMatch = html.match(/<b>Total Fat<\/b>&nbsp;([^<]*)/i) || html.match(/Total Fat[^<]*?([0-9.]+g)/i)
  const totalFat = totalFatMatch ? totalFatMatch[1].trim() : "0g"

  const satFatMatch = html.match(/Sat\. Fat&nbsp;([^<]*)/i) || html.match(/Saturated Fat[^<]*?([0-9.]+g)/i)
  const saturatedFat = satFatMatch ? satFatMatch[1].trim() : "0g"

  const transFatMatch = html.match(/Trans Fat&nbsp;([^<]*)/i) || html.match(/Trans Fat[^<]*?([0-9.]+g)/i)
  const transFat = transFatMatch ? transFatMatch[1].trim() : "0g"

  const cholesterolMatch =
    html.match(/<b>Cholesterol&nbsp;<\/b>([^<]*)/i) || html.match(/Cholesterol[^<]*?([0-9.]+mg)/i)
  const cholesterol = cholesterolMatch ? cholesterolMatch[1].trim() : "0mg"

  const sodiumMatch = html.match(/<b>Sodium&nbsp;<\/b>([^<]*)/i) || html.match(/Sodium[^<]*?([0-9.]+mg)/i)
  const sodium = sodiumMatch ? sodiumMatch[1].trim() : "0mg"

  const totalCarbsMatch = html.match(/<b>Tot\. Carb\.<\/b>&nbsp;([^<]*)/i) || html.match(/Total Carbs[^<]*?([0-9.]+g)/i)
  const totalCarbs = totalCarbsMatch ? totalCarbsMatch[1].trim() : "0g"

  const dietaryFiberMatch = html.match(/Dietary Fiber&nbsp;([^<]*)/i) || html.match(/Dietary Fiber[^<]*?([0-9.]+g)/i)
  const dietaryFiber = dietaryFiberMatch ? dietaryFiberMatch[1].trim() : "0g"

  const sugarsMatch = html.match(/Sugars&nbsp;([^<]*)/i) || html.match(/Sugars[^<]*?([0-9.]+g)/i)
  const sugars = sugarsMatch ? sugarsMatch[1].trim() : "0g"

  const proteinMatch = html.match(/<b>Protein&nbsp;<\/b>([^<]*)/i) || html.match(/Protein[^<]*?([0-9.]+g)/i)
  const protein = proteinMatch ? proteinMatch[1].trim() : "0g"

  // Extract ingredients
  const ingredientsMatch =
    html.match(/<b>INGREDIENTS:&nbsp;&nbsp;<\/b>([\s\S]*?)<\/p>/i) ||
    html.match(/INGREDIENTS:([\s\S]*?)(?:<\/div>|<div)/i)
  const ingredients = ingredientsMatch ? ingredientsMatch[1].trim() : ""

  // Extract daily values percentages
  const percentDailyValues: Record<string, string> = {}

  // Extract percentages using a more flexible approach
  const extractPercentage = (nutrient: string, pattern: RegExp): string => {
    const match = html.match(pattern)
    return match ? `${match[1]}%` : "0%"
  }

  // Total Fat percentage
  percentDailyValues["Total Fat"] = extractPercentage(
    "Total Fat",
    /Total Fat[\s\S]*?<td[^>]*align="center"[^>]*>\s*<b>(\d+)<\/b>%/i,
  )

  // Saturated Fat percentage
  percentDailyValues["Saturated Fat"] = extractPercentage(
    "Saturated Fat",
    /Sat\. Fat[\s\S]*?<td[^>]*align="center"[^>]*>\s*<b>(\d+)<\/b>%/i,
  )

  // Cholesterol percentage
  percentDailyValues["Cholesterol"] = extractPercentage(
    "Cholesterol",
    /Cholesterol[\s\S]*?<td[^>]*align="center"[^>]*>\s*<b>(\d+)<\/b>%/i,
  )

  // Sodium percentage
  percentDailyValues["Sodium"] = extractPercentage(
    "Sodium",
    /Sodium[\s\S]*?<td[^>]*align="center"[^>]*>\s*<b>(\d+)<\/b>%/i,
  )

  // Total Carbs percentage
  percentDailyValues["Total Carbs"] = extractPercentage(
    "Total Carbs",
    /Tot\. Carb\.[\s\S]*?<td[^>]*align="center"[^>]*>\s*<b>(\d+)<\/b>%/i,
  )

  // Dietary Fiber percentage
  percentDailyValues["Dietary Fiber"] = extractPercentage(
    "Dietary Fiber",
    /Dietary Fiber[\s\S]*?<td[^>]*align="center"[^>]*>\s*<b>(\d+)<\/b>%/i,
  )

  return {
    itemName,
    servingSize,
    calories,
    totalFat,
    saturatedFat,
    transFat,
    cholesterol,
    sodium,
    totalCarbs,
    dietaryFiber,
    sugars,
    protein,
    ingredients,
    allergens: "", // Not always present in the HTML
    percentDailyValues,
  }
}

