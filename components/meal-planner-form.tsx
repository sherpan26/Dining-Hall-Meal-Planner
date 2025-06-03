"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { generateMealPlan, type MealPlanFormData } from "@/app/actions/generate-meal-plan"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Import dining hall configurations
const DINING_HALLS = {
  "Busch Dining Hall": {
    baseUrl: "https://menuportal23.dining.rutgers.edu/foodpronet/pickmenu.aspx",
    locationNum: "04",
    locationName: "Busch+Dining+Hall",
    mealPeriods: ["Breakfast", "Lunch", "Dinner", "Knight+Room"],
  },
  "Livingston Dining Commons": {
    baseUrl: "https://menuportal23.dining.rutgers.edu/foodpronet/pickmenu.aspx",
    locationNum: "03",
    locationName: "Livingston+Dining+Commons",
    mealPeriods: ["Breakfast", "Lunch", "Dinner", "Knight+Room"],
  },
  "The Atrium": {
    baseUrl: "https://menuportal23.dining.rutgers.edu/FoodPronet/pickmenu.aspx",
    locationNum: "13",
    locationName: "The+Atrium",
    mealPeriods: ["Breakfast", "Lunch", "Dinner", "Late+Night"],
  },
  "Neilson Dining Hall": {
    baseUrl: "https://menuportal23.dining.rutgers.edu/FoodPronet/pickmenu.aspx",
    locationNum: "05",
    locationName: "Neilson+Dining+Hall",
    mealPeriods: ["Breakfast", "Lunch", "Dinner", "Knight+Room"],
  },
} as const

type DiningHall = keyof typeof DINING_HALLS

interface MealPlannerFormProps {
  onMealPlanGenerated?: (mealPlan: string | null) => void
}

export default function MealPlannerForm({ onMealPlanGenerated }: MealPlannerFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    dietaryRestrictions: "",
    calorieLimit: "",
    avoidFoods: "",
    maintenanceCalories: "",
    goal: "maintain",
    height: "",
    weight: "",
    selectedDiningHall: "",
    selectedMealPeriod: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleRadioChange = (value: string) => {
    setFormData({
      ...formData,
      goal: value,
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === "selectedDiningHall") {
      // Reset meal period when dining hall changes
      setFormData({
        ...formData,
        [name]: value,
        selectedMealPeriod: DINING_HALLS[value as DiningHall]?.mealPeriods[0] || "",
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Call the server action with the form data
      const result = await generateMealPlan(formData as MealPlanFormData)

      if (result?.success && result.mealPlan) {
        // Pass the meal plan to the parent component if the callback exists
        if (onMealPlanGenerated) {
          onMealPlanGenerated(result.mealPlan)
        }
      } else {
        console.error("Error:", result?.error || "Unknown error")
        if (onMealPlanGenerated) {
          onMealPlanGenerated("Failed to generate meal plan. Please try again.")
        }
      }
    } catch (error) {
      console.error("Error generating meal plan:", error)
      if (onMealPlanGenerated) {
        onMealPlanGenerated("An unexpected error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="dietaryRestrictions">Any dietary restrictions/allergies?</Label>
            <Textarea
              id="dietaryRestrictions"
              name="dietaryRestrictions"
              placeholder="e.g., vegetarian, gluten-free, nut allergies"
              value={formData.dietaryRestrictions}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label htmlFor="calorieLimit">Total meal calorie limits</Label>
            <Input
              id="calorieLimit"
              name="calorieLimit"
              type="number"
              placeholder="e.g., 2000"
              value={formData.calorieLimit}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label htmlFor="avoidFoods">Foods you dislike or want to avoid</Label>
            <Textarea
              id="avoidFoods"
              name="avoidFoods"
              placeholder="e.g., mushrooms, olives, seafood"
              value={formData.avoidFoods}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label htmlFor="maintenanceCalories">What are your maintenance calories?</Label>
            <Input
              id="maintenanceCalories"
              name="maintenanceCalories"
              type="number"
              placeholder="e.g., 2200"
              value={formData.maintenanceCalories}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <Label>What is your goal?</Label>
            <div className="flex flex-col space-y-2 mt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={formData.goal === "lose"}
                  onChange={() => handleRadioChange("lose")}
                  className="h-4 w-4"
                />
                <span>Lose weight</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={formData.goal === "maintain"}
                  onChange={() => handleRadioChange("maintain")}
                  className="h-4 w-4"
                />
                <span>Maintain weight</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={formData.goal === "gain"}
                  onChange={() => handleRadioChange("gain")}
                  className="h-4 w-4"
                />
                <span>Gain weight</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={formData.goal === "muscle"}
                  onChange={() => handleRadioChange("muscle")}
                  className="h-4 w-4"
                />
                <span>Gain muscle (assuming exercise)</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="height">What's your height?</Label>
              <Input
                id="height"
                name="height"
                placeholder="e.g., 5&apos;10&quot; or 178cm"
                value={formData.height || ""}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="weight">What's your body weight?</Label>
              <Input
                id="weight"
                name="weight"
                placeholder="e.g., 165lbs or 75kg"
                value={formData.weight || ""}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Add dining hall selection */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-medium mb-4">Use Current Menu (Optional)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a dining hall and meal period to generate a meal plan based on the current menu
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="selectedDiningHall">Dining Hall</Label>
                <Select
                  value={formData.selectedDiningHall}
                  onValueChange={(value) => handleSelectChange("selectedDiningHall", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dining hall" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Generic Plan)</SelectItem>
                    {Object.keys(DINING_HALLS).map((hall) => (
                      <SelectItem key={hall} value={hall}>
                        {hall}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.selectedDiningHall && (
                <div>
                  <Label htmlFor="selectedMealPeriod">Meal Period</Label>
                  <Select
                    value={formData.selectedMealPeriod}
                    onValueChange={(value) => handleSelectChange("selectedMealPeriod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select meal period" />
                    </SelectTrigger>
                    <SelectContent>
                      {DINING_HALLS[formData.selectedDiningHall as DiningHall]?.mealPeriods.map((period) => (
                        <SelectItem key={period} value={period}>
                          {period.replace("+", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Meal Plan...
            </>
          ) : (
            "Generate AI Meal Plan"
          )}
        </Button>
      </form>
    </div>
  )
}

