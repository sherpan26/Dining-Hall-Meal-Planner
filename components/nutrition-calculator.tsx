"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

export interface NutritionResults {
  bmr: number
  tdee: number
  protein: { min: number; max: number }
  carbs: { min: number; max: number }
  fat: { min: number; max: number }
  goalCalories: {
    lose: number
    maintain: number
    gain: number
  }
}

interface NutritionCalculatorProps {
  onResultsCalculated?: (results: NutritionResults | null) => void
}

export default function NutritionCalculator({ onResultsCalculated }: NutritionCalculatorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    age: "",
    gender: "male",
    height: "",
    weight: "",
    activityLevel: "moderate",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.age) {
      newErrors.age = "Age is required"
    } else if (Number.parseInt(formData.age) < 15 || Number.parseInt(formData.age) > 80) {
      newErrors.age = "Age must be between 15 and 80"
    }

    if (!formData.height) {
      newErrors.height = "Height is required"
    }

    if (!formData.weight) {
      newErrors.weight = "Weight is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Parse height input to cm
  const parseHeight = (heightStr: string): number => {
    // Check if height is in feet and inches format (e.g., 5'10")
    const feetInchesRegex = /(\d+)'(\d+)"/
    const feetInchesMatch = heightStr.match(feetInchesRegex)

    if (feetInchesMatch) {
      const feet = Number.parseInt(feetInchesMatch[1])
      const inches = Number.parseInt(feetInchesMatch[2])
      return feet * 30.48 + inches * 2.54 // Convert to cm
    }

    // Check if height is in feet and inches format without quotes (e.g., 5'10)
    const feetInchesNoQuoteRegex = /(\d+)'(\d+)/
    const feetInchesNoQuoteMatch = heightStr.match(feetInchesNoQuoteRegex)

    if (feetInchesNoQuoteMatch) {
      const feet = Number.parseInt(feetInchesNoQuoteMatch[1])
      const inches = Number.parseInt(feetInchesNoQuoteMatch[2])
      return feet * 30.48 + inches * 2.54 // Convert to cm
    }

    // Check if height is in cm format
    if (heightStr.toLowerCase().includes("cm")) {
      return Number.parseFloat(heightStr.toLowerCase().replace("cm", "").trim())
    }

    // If just a number, assume cm
    const numericValue = Number.parseFloat(heightStr)
    if (!isNaN(numericValue)) {
      // If the number is small, assume it's in feet and convert
      if (numericValue < 10) {
        return numericValue * 30.48
      }
      return numericValue
    }

    return 0
  }

  // Parse weight input to kg
  const parseWeight = (weightStr: string): number => {
    // Check if weight is in pounds format
    if (weightStr.toLowerCase().includes("lb") || weightStr.toLowerCase().includes("lbs")) {
      const pounds = Number.parseFloat(
        weightStr
          .toLowerCase()
          .replace(/lb|lbs/g, "")
          .trim(),
      )
      return pounds * 0.453592 // Convert to kg
    }

    // Check if weight is in kg format
    if (weightStr.toLowerCase().includes("kg")) {
      return Number.parseFloat(weightStr.toLowerCase().replace("kg", "").trim())
    }

    // If just a number, check the magnitude to guess the unit
    const numericValue = Number.parseFloat(weightStr)
    if (!isNaN(numericValue)) {
      // If the number is large, assume it's in pounds
      if (numericValue > 90) {
        return numericValue * 0.453592 // Convert to kg
      }
      return numericValue // Assume kg
    }

    return 0
  }

  // Calculate BMR using Mifflin-St Jeor Equation
  const calculateBMR = (age: number, gender: string, heightCm: number, weightKg: number): number => {
    if (gender === "male") {
      return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    } else {
      return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    }
  }

  // Calculate TDEE based on activity level
  const calculateTDEE = (bmr: number, activityLevel: string): number => {
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2, // Little or no exercise
      light: 1.375, // Light exercise 1-3 days/week
      moderate: 1.55, // Moderate exercise 3-5 days/week
      active: 1.725, // Hard exercise 6-7 days/week
      veryActive: 1.9, // Very hard exercise & physical job or 2x training
    }

    return Math.round(bmr * activityMultipliers[activityLevel])
  }

  // Calculate macronutrient recommendations
  const calculateMacros = (
    tdee: number,
  ): {
    protein: { min: number; max: number }
    carbs: { min: number; max: number }
    fat: { min: number; max: number }
  } => {
    // Protein: 1.6-2.2g per kg of bodyweight
    const weightKg = parseWeight(formData.weight)
    const proteinMin = Math.round(weightKg * 1.6)
    const proteinMax = Math.round(weightKg * 2.2)

    // Fat: 20-35% of calories
    const fatMin = Math.round((tdee * 0.2) / 9) // 9 calories per gram of fat
    const fatMax = Math.round((tdee * 0.35) / 9)

    // Carbs: remaining calories
    const proteinCalories = ((proteinMin + proteinMax) / 2) * 4 // 4 calories per gram of protein
    const fatCalories = ((fatMin + fatMax) / 2) * 9
    const remainingCalories = tdee - proteinCalories - fatCalories
    const carbsMin = Math.round((remainingCalories * 0.8) / 4) // 4 calories per gram of carbs
    const carbsMax = Math.round((remainingCalories * 1.2) / 4)

    return {
      protein: { min: proteinMin, max: proteinMax },
      carbs: { min: carbsMin, max: carbsMax },
      fat: { min: fatMin, max: fatMax },
    }
  }

  // Calculate calorie goals for weight loss, maintenance, and gain
  const calculateCalorieGoals = (tdee: number): { lose: number; maintain: number; gain: number } => {
    return {
      lose: Math.round(tdee * 0.8), // 20% deficit
      maintain: tdee,
      gain: Math.round(tdee * 1.15), // 15% surplus
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Parse inputs
      const age = Number.parseInt(formData.age)
      const heightCm = parseHeight(formData.height)
      const weightKg = parseWeight(formData.weight)

      // Calculate BMR
      const bmr = Math.round(calculateBMR(age, formData.gender, heightCm, weightKg))

      // Calculate TDEE
      const tdee = calculateTDEE(bmr, formData.activityLevel)

      // Calculate macros
      const macros = calculateMacros(tdee)

      // Calculate calorie goals
      const calorieGoals = calculateCalorieGoals(tdee)

      // Create results object
      const results: NutritionResults = {
        bmr,
        tdee,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        goalCalories: calorieGoals,
      }

      // Add a small delay to simulate calculation
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (onResultsCalculated) {
        onResultsCalculated(results)
      }
    } catch (error) {
      console.error("Error calculating nutrition:", error)
      if (onResultsCalculated) {
        onResultsCalculated(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            name="age"
            type="number"
            placeholder="e.g., 20"
            value={formData.age}
            onChange={handleInputChange}
            className={errors.age ? "border-destructive" : ""}
          />
          {errors.age && <p className="text-destructive text-sm mt-1">{errors.age}</p>}
        </div>

        <div>
          <Label>Gender</Label>
          <div className="flex space-x-4 mt-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="gender"
                checked={formData.gender === "male"}
                onChange={() => handleSelectChange("gender", "male")}
                className="h-4 w-4"
              />
              <span>Male</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="gender"
                checked={formData.gender === "female"}
                onChange={() => handleSelectChange("gender", "female")}
                className="h-4 w-4"
              />
              <span>Female</span>
            </label>
          </div>
        </div>

        <div>
          <Label htmlFor="height">Height</Label>
          <Input
            id="height"
            name="height"
            placeholder="e.g., 5'10&quot; or 178cm"
            value={formData.height}
            onChange={handleInputChange}
            className={errors.height ? "border-destructive" : ""}
          />
          {errors.height && <p className="text-destructive text-sm mt-1">{errors.height}</p>}
        </div>

        <div>
          <Label htmlFor="weight">Weight</Label>
          <Input
            id="weight"
            name="weight"
            placeholder="e.g., 165lbs or 75kg"
            value={formData.weight}
            onChange={handleInputChange}
            className={errors.weight ? "border-destructive" : ""}
          />
          {errors.weight && <p className="text-destructive text-sm mt-1">{errors.weight}</p>}
        </div>

        <div>
          <Label htmlFor="activityLevel">Activity Level</Label>
          <Select value={formData.activityLevel} onValueChange={(value) => handleSelectChange("activityLevel", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select activity level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
              <SelectItem value="light">Light (exercise 1-3 times/week)</SelectItem>
              <SelectItem value="moderate">Moderate (exercise 4-5 times/week)</SelectItem>
              <SelectItem value="active">Active (daily exercise or intense exercise 3-4 times/week)</SelectItem>
              <SelectItem value="veryActive">Very Active (intense exercise 6-7 times/week)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculating...
          </>
        ) : (
          "Calculate"
        )}
      </Button>
    </form>
  )
}

