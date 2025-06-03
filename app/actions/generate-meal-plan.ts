"use server"

import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { getGoogleModelWithRotatingKey } from "@/lib/api-key-rotation"

// Define the form data type
export type MealPlanFormData = {
  dietaryRestrictions: string
  calorieLimit: string
  avoidFoods: string
  maintenanceCalories: string
  goal: string
  height: string
  weight: string
  selectedDiningHall?: string
  selectedMealPeriod?: string
}

// Update the fetchMenuData function to use the Node.js native fetch with an absolute URL:

// Function to fetch menu data from the API
async function fetchMenuData(diningHall: string, mealPeriod: string) {
  try {
    // Format date as MM/DD/YYYY
    const today = new Date()
    const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`

    // Import the API handler directly
    const { POST } = await import("@/app/api/menu/route")

    // Create a mock request
    const request = new Request("http://localhost/api/menu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        diningHall,
        date: formattedDate,
        mealPeriod,
      }),
    })

    // Call the API handler directly
    const response = await POST(request)

    if (!response.ok) {
      throw new Error("Failed to fetch menu data")
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching menu data:", error)
    return null
  }
}

// Function to create a menu summary for the AI
function createMenuSummary(menuData: any) {
  if (!menuData) return ""

  let menuSummary = `Menu at ${menuData.diningHall} (${menuData.mealPeriod.replace("+", " ")}):\n\n`

  // Get all categories
  const categories = Object.keys(menuData.menuByCategory)

  categories.forEach((category) => {
    menuSummary += `${category}:\n`

    // Get all items in this category
    const items = menuData.menuByCategory[category]

    // Include names only (no nutrition info)
    items.forEach((item: any) => {
      menuSummary += `- ${item.name}\n`
    })

    menuSummary += "\n"
  })

  return menuSummary
}

export async function generateMealPlan(formData: MealPlanFormData) {
  try {
    // Fetch menu data if dining hall and meal period are provided
    let menuSummary = ""
    if (formData.selectedDiningHall && formData.selectedMealPeriod) {
      const menuData = await fetchMenuData(formData.selectedDiningHall, formData.selectedMealPeriod)
      if (menuData) {
        menuSummary = createMenuSummary(menuData)
        console.log(`Menu summary created (${menuSummary.length} characters)`)
      }
    }

    // Construct a prompt based on the user's preferences
    const prompt = `
      Create a personalized meal plan for a Rutgers University student with the following preferences:
      
      ${formData.dietaryRestrictions ? `- Dietary restrictions: ${formData.dietaryRestrictions}` : "- No dietary restrictions"}
      ${formData.calorieLimit ? `- Calorie limit: ${formData.calorieLimit} calories per day` : ""}
      ${formData.avoidFoods ? `- Foods to avoid: ${formData.avoidFoods}` : "- No specific foods to avoid"}
      ${formData.maintenanceCalories ? `- Maintenance calories: ${formData.maintenanceCalories}` : ""}
      - Goal: ${
        formData.goal === "lose"
          ? "Lose weight"
          : formData.goal === "maintain"
            ? "Maintain weight"
            : formData.goal === "gain"
              ? "Gain weight"
              : "Gain muscle (with exercise)"
      }
      ${formData.height ? `- Height: ${formData.height}` : ""}
      ${formData.weight ? `- Weight: ${formData.weight}` : ""}
      
      ${
        menuSummary
          ? `Based on the current menu available at ${formData.selectedDiningHall}:
      
      ${menuSummary}
      
      Create a meal plan using ONLY items from this menu. For each meal:`
          : `Create a full day meal plan with breakfast, lunch, dinner, and a snack. For each meal:`
      }
      1. ${!menuSummary ? "Specify which Rutgers dining hall to visit (The Atrium, Livingston Dining Hall, Busch Dining Hall, or Neilson Dining Hall)" : ""}
      2. Provide the name of the meal
      3. Include estimated calories and macronutrients (protein, carbs, fat) for EACH food item
      4. Include a total nutrition count for each meal
      
      Format the response as a markdown document with sections for each meal.
      For each food item, use the format "**[Food Item]** (Calories: X, Protein: Xg, Carbs: Xg, Fat: Xg)" on its own line.
    `

    // Get the model config with a rotated API key
    const modelConfig = getGoogleModelWithRotatingKey("gemini-2.0-flash")

    // Generate the meal plan using Gemini
    const response = await generateText({
      model: google(modelConfig.model, {
        apiKey: modelConfig.apiKey,
      }),
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
    })

    // Make sure we have a valid response with text
    if (!response || !response.text) {
      throw new Error("Failed to generate meal plan text")
    }

    return { success: true, mealPlan: response.text }
  } catch (error) {
    console.error("Error generating meal plan:", error)
    // Fall back to simulated response if the API fails
    return generateSimulatedMealPlan(formData)
  }
}

// Fallback function to generate a simulated meal plan
function generateSimulatedMealPlan(formData: MealPlanFormData) {
  // Adjust the meal plan based on the user's goal
  const goalAdjustment = {
    lose: { calorieMultiplier: 0.8, proteinMultiplier: 1.2 },
    maintain: { calorieMultiplier: 1.0, proteinMultiplier: 1.0 },
    gain: { calorieMultiplier: 1.2, proteinMultiplier: 1.0 },
    muscle: { calorieMultiplier: 1.1, proteinMultiplier: 1.5 },
  }

  const adjustment = goalAdjustment[formData.goal as keyof typeof goalAdjustment] || goalAdjustment.maintain

  // Base calorie target (can be overridden by user input)
  let baseCalories = 2000
  if (formData.calorieLimit) {
    baseCalories = Number.parseInt(formData.calorieLimit) || 2000
  } else if (formData.maintenanceCalories) {
    baseCalories = (Number.parseInt(formData.maintenanceCalories) || 2000) * adjustment.calorieMultiplier
  }

  // Adjust for dietary restrictions
  const isVegetarian = formData.dietaryRestrictions?.toLowerCase().includes("vegetarian")
  const isVegan = formData.dietaryRestrictions?.toLowerCase().includes("vegan")
  const isGlutenFree = formData.dietaryRestrictions?.toLowerCase().includes("gluten")

  // Create meal plan
  const breakfast = {
    name: isVegan
      ? "Tofu Scramble with Vegetables"
      : isVegetarian
        ? "Vegetable Omelette with Cheese"
        : "Scrambled Eggs with Turkey Bacon",
    location: formData.selectedDiningHall || "The Atrium",
    calories: Math.round(baseCalories * 0.25),
    protein: Math.round(((baseCalories * 0.25) / 16) * adjustment.proteinMultiplier),
    carbs: Math.round(((baseCalories * 0.25) / 4) * 0.5),
    fat: Math.round(((baseCalories * 0.25) / 9) * 0.3),
  }

  const lunch = {
    name: isVegan
      ? "Quinoa Bowl with Roasted Vegetables"
      : isVegetarian
        ? "Mediterranean Salad with Feta"
        : "Grilled Chicken Wrap with Sweet Potato Fries",
    location: formData.selectedDiningHall || "Livingston Dining Hall",
    calories: Math.round(baseCalories * 0.3),
    protein: Math.round(((baseCalories * 0.3) / 16) * adjustment.proteinMultiplier),
    carbs: Math.round(((baseCalories * 0.3) / 4) * 0.5),
    fat: Math.round(((baseCalories * 0.3) / 9) * 0.3),
  }

  const dinner = {
    name: isVegan
      ? "Vegetable Stir Fry with Tofu"
      : isVegetarian
        ? "Eggplant Parmesan with Pasta"
        : "Grilled Salmon with Roasted Vegetables",
    location: formData.selectedDiningHall || "Busch Dining Hall",
    calories: Math.round(baseCalories * 0.35),
    protein: Math.round(((baseCalories * 0.35) / 16) * adjustment.proteinMultiplier),
    carbs: Math.round(((baseCalories * 0.35) / 4) * 0.5),
    fat: Math.round(((baseCalories * 0.35) / 9) * 0.3),
  }

  const snack = {
    name: isVegan
      ? "Fresh Fruit with Almond Butter"
      : isVegetarian
        ? "Greek Yogurt with Honey and Berries"
        : "Protein Shake with Banana",
    location: formData.selectedDiningHall || "Neilson Dining Hall",
    calories: Math.round(baseCalories * 0.1),
    protein: Math.round(((baseCalories * 0.1) / 16) * adjustment.proteinMultiplier),
    carbs: Math.round(((baseCalories * 0.1) / 4) * 0.5),
    fat: Math.round(((baseCalories * 0.1) / 9) * 0.3),
  }

  // Format the meal plan as markdown
  const mealPlan = `
# Personalized Meal Plan

Based on your preferences:
${formData.dietaryRestrictions ? `- Dietary restrictions: ${formData.dietaryRestrictions}` : "- No dietary restrictions"}
${formData.calorieLimit ? `- Calorie limit: ${formData.calorieLimit} calories per day` : ""}
${formData.avoidFoods ? `- Foods to avoid: ${formData.avoidFoods}` : "- No specific foods to avoid"}
- Goal: ${
    formData.goal === "lose"
      ? "Lose weight"
      : formData.goal === "maintain"
        ? "Maintain weight"
        : formData.goal === "gain"
          ? "Gain weight"
          : "Gain muscle (with exercise)"
  }
${formData.height ? `- Height: ${formData.height}` : ""}
${formData.weight ? `- Weight: ${formData.weight}` : ""}

## Breakfast
${breakfast.name} (${breakfast.location})
- **Eggs** (Calories: 120, Protein: 12g, Carbs: 1g, Fat: 8g)
- **Toast** (Calories: 80, Protein: 3g, Carbs: 15g, Fat: 1g)
- **Fruit** (Calories: 60, Protein: 1g, Carbs: 15g, Fat: 0g)

Total: Calories: ${breakfast.calories}, Protein: ${breakfast.protein}g, Carbs: ${breakfast.carbs}g, Fat: ${breakfast.fat}g

## Lunch
${lunch.name} (${lunch.location})
- **Grilled Chicken** (Calories: 180, Protein: 30g, Carbs: 0g, Fat: 6g)
- **Whole Wheat Wrap** (Calories: 120, Protein: 4g, Carbs: 20g, Fat: 3g)
- **Sweet Potato Fries** (Calories: 150, Protein: 2g, Carbs: 30g, Fat: 5g)

Total: Calories: ${lunch.calories}, Protein: ${lunch.protein}g, Carbs: ${lunch.carbs}g, Fat: ${lunch.fat}g

## Dinner
${dinner.name} (${dinner.location})
- **Salmon Fillet** (Calories: 220, Protein: 25g, Carbs: 0g, Fat: 12g)
- **Brown Rice** (Calories: 150, Protein: 3g, Carbs: 32g, Fat: 1g)
- **Roasted Vegetables** (Calories: 100, Protein: 2g, Carbs: 20g, Fat: 2g)

Total: Calories: ${dinner.calories}, Protein: ${dinner.protein}g, Carbs: ${dinner.carbs}g, Fat: ${dinner.fat}g

## Snack
${snack.name} (${snack.location})
- **Protein Shake** (Calories: 120, Protein: 20g, Carbs: 5g, Fat: 2g)
- **Banana** (Calories: 105, Protein: 1g, Carbs: 27g, Fat: 0g)

Total: Calories: ${snack.calories}, Protein: ${snack.protein}g, Carbs: ${snack.carbs}g, Fat: ${snack.fat}g

### Daily Totals
- Total Calories: ${breakfast.calories + lunch.calories + dinner.calories + snack.calories}
- Total Protein: ${breakfast.protein + lunch.protein + dinner.protein + snack.protein}g
- Total Carbs: ${breakfast.carbs + lunch.carbs + dinner.carbs + snack.carbs}g
- Total Fat: ${breakfast.fat + lunch.fat + dinner.fat + snack.fat}g
  `

  return { success: true, mealPlan }
}

