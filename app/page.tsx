"use client"

import { useState } from "react"
import MealPlannerForm from "@/components/meal-planner-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import NutritionCalculator, { type NutritionResults } from "@/components/nutrition-calculator"
import AIRecommendations from "@/components/ai-recommendations"
import MealHistoryTracker from "@/components/meal-history-tracker"
import NutritionDashboard from "@/components/nutrition-dashboard"
import ViewMenu from "@/components/view-menu"

export default function Home() {
  return (
    <main className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          Rutgers Dining Hall Menu
        </h1>
        <p className="text-muted-foreground">
          AI-powered meal planning for healthier dining choices
        </p>
      </header>

      <Tabs defaultValue="planner" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="planner">Meal Planner</TabsTrigger>
          <TabsTrigger value="calculator">Nutrition Calculator</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="meal-history">Meal History</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="view-menu">View Menu</TabsTrigger>
        </TabsList>

        <TabsContent value="planner">
          <MealPlannerWithPreview />
        </TabsContent>

        <TabsContent value="calculator">
          <NutritionCalculatorWithResults />
        </TabsContent>

        <TabsContent value="recommendations">
          <div>
            <h2 className="text-2xl font-bold mb-6">AI Dining Recommendations</h2>
            <AIRecommendations />
          </div>
        </TabsContent>

        <TabsContent value="meal-history">
          <div>
            <h2 className="text-2xl font-bold mb-6">Meal History Tracker</h2>
            <MealHistoryTracker />
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <div>
            <h2 className="text-2xl font-bold mb-6">Nutrition Dashboard</h2>
            <NutritionDashboard />
          </div>
        </TabsContent>

        <TabsContent value="view-menu">
          <div>
            <h2 className="text-2xl font-bold mb-6">Dining Hall Menus</h2>
            <ViewMenu />
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}

// Add this helper function above the renderMealPlan function
function processBoldText(text: string) {
  if (!text.includes("**")) return text

  const parts = []
  let currentIndex = 0
  let boldStart = text.indexOf("**", currentIndex)

  while (boldStart !== -1) {
    // Add text before the bold marker
    if (boldStart > currentIndex) {
      parts.push(text.substring(currentIndex, boldStart))
    }

    // Find the end of the bold section
    const boldEnd = text.indexOf("**", boldStart + 2)
    if (boldEnd === -1) break // No closing marker

    // Add the bold text
    const boldText = text.substring(boldStart + 2, boldEnd)
    parts.push(<strong key={`bold-${boldStart}`}>{boldText}</strong>)

    // Update the current index
    currentIndex = boldEnd + 2

    // Find the next bold marker
    boldStart = text.indexOf("**", currentIndex)
  }

  // Add any remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex))
  }

  return parts.length > 0 ? parts : text
}

// New component to handle the meal planner and preview together
function MealPlannerWithPreview() {
  const [mealPlanPreview, setMealPlanPreview] = useState<string | null>(null)

  // Update the renderMealPlan function to handle bold text formatting

  // Replace the existing renderMealPlan function with this improved version
  const renderMealPlan = (markdown: string | null) => {
    if (!markdown) {
      return <p className="text-muted-foreground">Your meal plan will appear here</p>
    }

    // Simple rendering without HTML conversion
    return (
      <div className="prose dark:prose-invert max-w-none text-sm">
        <p className="text-xs text-muted-foreground mb-2">AI-generated meal plan (summarized for readability)</p>
        {markdown.split("\n").map((line, index) => {
          // Handle headers
          if (line.startsWith("# ")) {
            return (
              <h1 key={index} className="text-xl font-bold">
                {line.substring(2)}
              </h1>
            )
          } else if (line.startsWith("## ")) {
            return (
              <h2 key={index} className="text-lg font-semibold mt-4">
                {line.substring(3)}
              </h2>
            )
          } else if (line.startsWith("### ")) {
            return (
              <h3 key={index} className="text-base font-medium mt-3">
                {line.substring(4)}
              </h3>
            )
          }
          // Handle food items with nutrition info - match pattern like "**Food Item** (Calories: X, Protein: Xg, Carbs: Xg, Fat: Xg)"
          else if (line.includes("**") && line.includes("(Calories:")) {
            // Extract the food item name and nutrition info
            const foodItemMatch = line.match(/\*\*(.*?)\*\*\s*($$Calories:.*?$$)/)
            if (foodItemMatch) {
              const foodName = foodItemMatch[1]
              const nutritionInfo = foodItemMatch[2]

              // Parse nutrition values
              const caloriesMatch = nutritionInfo.match(/Calories:\s*(\d+)/)
              const proteinMatch = nutritionInfo.match(/Protein:\s*(\d+\.?\d*)g/)
              const carbsMatch = nutritionInfo.match(/Carbs:\s*(\d+\.?\d*)g/)
              const fatMatch = nutritionInfo.match(/Fat:\s*(\d+\.?\d*)g/)

              return (
                <div key={index} className="flex flex-col ml-2 mb-2">
                  <div className="flex items-start">
                    <span className="mr-2 text-primary">•</span>
                    <span className="font-medium">{foodName}</span>
                  </div>
                  <div className="flex flex-wrap ml-6 mt-1 gap-1">
                    {caloriesMatch && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">Calories: {caloriesMatch[1]}</span>
                    )}
                    {proteinMatch && (
                      <span className="text-xs bg-black text-white px-2 py-1 rounded">Protein: {proteinMatch[1]}g</span>
                    )}
                    {carbsMatch && (
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                        Carbs: {carbsMatch[1]}g
                      </span>
                    )}
                    {fatMatch && (
                      <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded">
                        Fat: {fatMatch[1]}g
                      </span>
                    )}
                  </div>
                </div>
              )
            }
          }
          // Handle meal totals - match pattern like "Total: Calories: X, Protein: Xg, Carbs: Xg, Fat: Xg"
          else if (line.includes("Total:") && line.includes("Calories:")) {
            // Extract the nutrition info
            const caloriesMatch = line.match(/Calories:\s*(\d+)/)
            const proteinMatch = line.match(/Protein:\s*(\d+\.?\d*)g/)
            const carbsMatch = line.match(/Carbs:\s*(\d+\.?\d*)g/)
            const fatMatch = line.match(/Fat:\s*(\d+\.?\d*)g/)

            return (
              <div key={index} className="mt-2 mb-4 bg-muted p-3 rounded-md">
                <div className="text-sm font-medium mb-1">Meal Total:</div>
                <div className="flex flex-wrap gap-2">
                  {caloriesMatch && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">Calories: {caloriesMatch[1]}</span>
                  )}
                  {proteinMatch && (
                    <span className="text-xs bg-black text-white px-2 py-1 rounded">Protein: {proteinMatch[1]}g</span>
                  )}
                  {carbsMatch && (
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      Carbs: {carbsMatch[1]}g
                    </span>
                  )}
                  {fatMatch && (
                    <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded">
                      Fat: {fatMatch[1]}g
                    </span>
                  )}
                </div>
              </div>
            )
          }
          // Handle list items - make them more compact
          else if (line.startsWith("- ")) {
            // Skip lines that are just repeating the section title or have minimal info
            if (line.includes("Based on your preferences") || line.trim().length < 5) {
              return null
            }
            // Process bold text in list items
            const processedText = processBoldText(line.substring(2))
            return (
              <li key={index} className="text-sm my-0.5">
                {processedText}
              </li>
            )
          }
          // Handle empty lines - reduce spacing
          else if (line.trim() === "") {
            return index > 0 && index < markdown.split("\n").length - 1 ? <div key={index} className="h-1" /> : null
          }
          // Handle regular text - make it more compact and skip redundant info
          else {
            // Skip redundant or verbose lines
            if (
              line.includes("calories per day") ||
              line.includes("No specific foods") ||
              line.includes("No dietary restrictions") ||
              line.trim().length < 3
            ) {
              return null
            }
            // Process bold text in paragraphs
            const processedText = processBoldText(line)
            return (
              <p key={index} className="text-sm my-1">
                {processedText}
              </p>
            )
          }
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Meal Planner Questions</h2>
        <MealPlannerForm onMealPlanGenerated={setMealPlanPreview} />
      </div>
      <div className="bg-muted p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">AI Meal Plan Preview</h3>
        <p className="text-muted-foreground mb-4">Complete the form to generate your personalized AI meal plan</p>
        <div className="bg-background rounded-md border overflow-auto p-4 max-h-[600px]">
          {renderMealPlan(mealPlanPreview)}
        </div>
      </div>
    </div>
  )
}

function NutritionCalculatorWithResults() {
  const [results, setResults] = useState<NutritionResults | null>(null)

  const renderResults = () => {
    if (!results) return <p className="text-muted-foreground">Nutritional data will appear here</p>

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium">BMR (Basal Metabolic Rate)</h3>
            <p className="text-2xl font-bold">{results.bmr} calories</p>
          </div>
          <div>
            <h3 className="text-sm font-medium">TDEE (Total Daily Energy Expenditure)</h3>
            <p className="text-2xl font-bold">{results.tdee} calories</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Macronutrient Recommendations</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="text-xs text-muted-foreground">Protein</h4>
              <p className="font-medium">
                {results.protein.min}-{results.protein.max}g
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="text-xs text-muted-foreground">Carbs</h4>
              <p className="font-medium">
                {results.carbs.min}-{results.carbs.max}g
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="text-xs text-muted-foreground">Fat</h4>
              <p className="font-medium">
                {results.fat.min}-{results.fat.max}g
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Calorie Goals</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="text-xs text-muted-foreground">Weight Loss</h4>
              <p className="font-medium">{results.goalCalories.lose} cal</p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="text-xs text-muted-foreground">Maintenance</h4>
              <p className="font-medium">{results.goalCalories.maintain} cal</p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="text-xs text-muted-foreground">Weight Gain</h4>
              <p className="font-medium">{results.goalCalories.gain} cal</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Nutrition Calculator</h2>
        <NutritionCalculator onResultsCalculated={setResults} />
      </div>
      <div className="bg-muted p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Nutritional Analysis</h3>
        <p className="text-muted-foreground mb-4">Your personalized nutritional breakdown will appear here</p>
        <div className="bg-background rounded-md border p-4">{renderResults()}</div>
      </div>
    </div>
  )
}

