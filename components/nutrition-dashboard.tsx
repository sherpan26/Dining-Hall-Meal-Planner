"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EVENTS, addCustomEventListener } from "@/lib/events"

export default function NutritionDashboard() {
  const [timeRange, setTimeRange] = useState("week")
  const [nutritionSummary, setNutritionSummary] = useState({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalSaturatedFat: 0,
    totalSodium: 0,
    totalSugars: 0,
    totalFiber: 0,
    totalCholesterol: 0,
    mealCount: 0,
    averageRating: 0,
    diningHallFrequency: {} as Record<string, number>,
    mealTypeFrequency: {} as Record<string, number>,
  })
  const [dailyData, setDailyData] = useState<any[]>([])

  // Function to load and process meal history data
  const loadMealData = () => {
    const savedMeals = localStorage.getItem("mealHistory")
    if (savedMeals) {
      try {
        const meals = JSON.parse(savedMeals).map((meal: any) => ({
          ...meal,
          date: new Date(meal.date),
        }))

        // Filter meals based on time range
        const now = new Date()
        const filteredMeals = meals.filter((meal: any) => {
          const mealDate = new Date(meal.date)
          if (timeRange === "today") {
            return mealDate.toDateString() === now.toDateString()
          } else if (timeRange === "week") {
            const weekAgo = new Date(now)
            weekAgo.setDate(now.getDate() - 7)
            return mealDate >= weekAgo
          } else if (timeRange === "month") {
            const monthAgo = new Date(now)
            monthAgo.setMonth(now.getMonth() - 1)
            return mealDate >= monthAgo
          }
          return true // "all" time range
        })

        // Calculate nutrition summary
        const summary = calculateNutritionSummary(filteredMeals)
        setNutritionSummary(summary)

        // Calculate daily data for charts
        const daily = calculateDailyData(filteredMeals)
        setDailyData(daily)
      } catch (error) {
        console.error("Error processing meal history:", error)
        // Use empty data as fallback
        setNutritionSummary(getEmptyNutritionSummary())
        setDailyData([])
      }
    } else {
      // Use empty data if no meal history exists
      setNutritionSummary(getEmptyNutritionSummary())
      setDailyData([])
    }
  }

  // Load and process meal history data when component mounts or timeRange changes
  useEffect(() => {
    loadMealData()
  }, [timeRange])

  // Set up event listeners for real-time updates
  useEffect(() => {
    const removeAddListener = addCustomEventListener(EVENTS.MEAL_ADDED, (newMeal) => {
      console.log("Dashboard received meal added event:", newMeal)
      loadMealData() // Reload data when a new meal is added
    })

    const removeUpdateListener = addCustomEventListener(EVENTS.MEAL_UPDATED, (updatedMeal) => {
      console.log("Dashboard received meal updated event:", updatedMeal)
      loadMealData() // Reload data when a meal is updated
    })

    const removeDeleteListener = addCustomEventListener(EVENTS.MEAL_DELETED, (deletedMealId) => {
      console.log("Dashboard received meal deleted event:", deletedMealId)
      loadMealData() // Reload data when a meal is deleted
    })

    // Clean up event listeners on component unmount
    return () => {
      removeAddListener()
      removeUpdateListener()
      removeDeleteListener()
    }
  }, [timeRange]) // Include timeRange in dependencies to ensure correct filtering

  // Helper function to calculate nutrition summary
  const calculateNutritionSummary = (meals: any[]) => {
    const summary = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalSaturatedFat: 0,
      totalSodium: 0,
      totalSugars: 0,
      totalFiber: 0,
      totalCholesterol: 0,
      mealCount: meals.length,
      averageRating: 0,
      diningHallFrequency: {} as Record<string, number>,
      mealTypeFrequency: {} as Record<string, number>,
    }

    let totalRating = 0

    meals.forEach((meal) => {
      // Add nutritional info
      if (meal.nutritionalInfo) {
        summary.totalCalories += meal.nutritionalInfo.calories || 0
        summary.totalProtein += meal.nutritionalInfo.protein || 0
        summary.totalCarbs += meal.nutritionalInfo.carbs || 0
        summary.totalFat += meal.nutritionalInfo.fat || 0

        // Add additional nutrition metrics
        summary.totalSaturatedFat += meal.nutritionalInfo.saturatedFat || 0
        summary.totalSodium += meal.nutritionalInfo.sodium || 0
        summary.totalSugars += meal.nutritionalInfo.sugars || 0
        summary.totalFiber += meal.nutritionalInfo.dietaryFiber || 0
        summary.totalCholesterol += meal.nutritionalInfo.cholesterol || 0
      }

      // Add rating
      totalRating += meal.rating || 0

      // Count dining hall frequency
      if (meal.diningHall) {
        summary.diningHallFrequency[meal.diningHall] = (summary.diningHallFrequency[meal.diningHall] || 0) + 1
      }

      // Count meal type frequency
      if (meal.mealType) {
        summary.mealTypeFrequency[meal.mealType] = (summary.mealTypeFrequency[meal.mealType] || 0) + 1
      }
    })

    // Calculate average rating
    summary.averageRating = meals.length > 0 ? totalRating / meals.length : 0

    return summary
  }

  // Helper function to calculate daily data for charts
  const calculateDailyData = (meals: any[]) => {
    // Group meals by date
    const mealsByDate = meals.reduce(
      (acc, meal) => {
        const dateStr = new Date(meal.date).toDateString()
        if (!acc[dateStr]) {
          acc[dateStr] = []
        }
        acc[dateStr].push(meal)
        return acc
      },
      {} as Record<string, any[]>,
    )

    // Calculate daily totals
    const dailyData = Object.entries(mealsByDate).map(([dateStr, dateMeals]) => {
      const date = new Date(dateStr)
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]

      const dailyTotals = {
        date: dayName,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }

      dateMeals.forEach((meal) => {
        if (meal.nutritionalInfo) {
          dailyTotals.calories += meal.nutritionalInfo.calories || 0
          dailyTotals.protein += meal.nutritionalInfo.protein || 0
          dailyTotals.carbs += meal.nutritionalInfo.carbs || 0
          dailyTotals.fat += meal.nutritionalInfo.fat || 0
        }
      })

      return dailyTotals
    })

    // Sort by day of week
    const dayOrder = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    dailyData.sort((a, b) => dayOrder[a.date as keyof typeof dayOrder] - dayOrder[b.date as keyof typeof dayOrder])

    return dailyData
  }

  // Helper function to get empty nutrition summary
  const getEmptyNutritionSummary = () => {
    return {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalSaturatedFat: 0,
      totalSodium: 0,
      totalSugars: 0,
      totalFiber: 0,
      totalCholesterol: 0,
      mealCount: 0,
      averageRating: 0,
      diningHallFrequency: {},
      mealTypeFrequency: {},
    }
  }

  // Function to render bar charts using div elements
  const renderBarChart = (data: any[], dataKey: string, maxValue: number) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          No data available. Add meals to see your nutrition trends.
        </div>
      )
    }

    return (
      <div className="flex items-end h-40 gap-1">
        {data.map((entry, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className="w-full bg-primary rounded-t"
              style={{
                height: `${Math.max((entry[dataKey] / maxValue) * 100, 5)}%`,
              }}
            />
            <div className="text-xs mt-1">{entry.date}</div>
          </div>
        ))}
      </div>
    )
  }

  // Function to render pie chart using div elements
  const renderPieChart = (data: Record<string, number>) => {
    const entries = Object.entries(data)

    if (entries.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          No data available. Add meals to see your statistics.
        </div>
      )
    }

    const total = entries.reduce((sum, [_, value]) => sum + value, 0)
    const items = entries.map(([key, value]) => ({
      name: key,
      value,
      percentage: Math.round((value / total) * 100),
    }))

    return (
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm">{item.name}</span>
              <span className="text-sm font-medium">{item.percentage}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: `${item.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Nutrition Summary</h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Calories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionSummary.totalCalories}</div>
            <p className="text-xs text-muted-foreground">
              {nutritionSummary.mealCount > 0
                ? `${Math.round(nutritionSummary.totalCalories / nutritionSummary.mealCount)} avg per meal`
                : "No meals recorded"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Protein</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionSummary.totalProtein}g</div>
            <p className="text-xs text-muted-foreground">
              {nutritionSummary.mealCount > 0
                ? `${Math.round(nutritionSummary.totalProtein / nutritionSummary.mealCount)}g avg per meal`
                : "No meals recorded"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Carbs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionSummary.totalCarbs}g</div>
            <p className="text-xs text-muted-foreground">
              {nutritionSummary.mealCount > 0
                ? `${Math.round(nutritionSummary.totalCarbs / nutritionSummary.mealCount)}g avg per meal`
                : "No meals recorded"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionSummary.totalFat}g</div>
            <p className="text-xs text-muted-foreground">
              {nutritionSummary.mealCount > 0
                ? `${Math.round(nutritionSummary.totalFat / nutritionSummary.mealCount)}g avg per meal`
                : "No meals recorded"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add a new section after the main nutrition cards to display additional nutrition metrics */}
      {nutritionSummary.mealCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
          {nutritionSummary.totalSaturatedFat > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Saturated Fat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{nutritionSummary.totalSaturatedFat}g</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(nutritionSummary.totalSaturatedFat / nutritionSummary.mealCount)}g avg per meal
                </p>
              </CardContent>
            </Card>
          )}

          {nutritionSummary.totalSodium > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sodium</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{nutritionSummary.totalSodium}mg</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(nutritionSummary.totalSodium / nutritionSummary.mealCount)}mg avg per meal
                </p>
              </CardContent>
            </Card>
          )}

          {nutritionSummary.totalSugars > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sugars</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{nutritionSummary.totalSugars}g</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(nutritionSummary.totalSugars / nutritionSummary.mealCount)}g avg per meal
                </p>
              </CardContent>
            </Card>
          )}

          {nutritionSummary.totalFiber > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Fiber</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{nutritionSummary.totalFiber}g</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(nutritionSummary.totalFiber / nutritionSummary.mealCount)}g avg per meal
                </p>
              </CardContent>
            </Card>
          )}

          {nutritionSummary.totalCholesterol > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Cholesterol</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{nutritionSummary.totalCholesterol}mg</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(nutritionSummary.totalCholesterol / nutritionSummary.mealCount)}mg avg per meal
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Weekly Calories</CardTitle>
            <CardDescription>Calorie intake for the past week</CardDescription>
          </CardHeader>
          <CardContent>
            {renderBarChart(dailyData, "calories", Math.max(...dailyData.map((d) => d.calories), 1))}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Weekly Macros</CardTitle>
            <CardDescription>Protein, carbs, and fat for the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="protein">
              <TabsList className="mb-4">
                <TabsTrigger value="protein">Protein</TabsTrigger>
                <TabsTrigger value="carbs">Carbs</TabsTrigger>
                <TabsTrigger value="fat">Fat</TabsTrigger>
              </TabsList>
              <TabsContent value="protein">
                {renderBarChart(dailyData, "protein", Math.max(...dailyData.map((d) => d.protein), 1))}
              </TabsContent>
              <TabsContent value="carbs">
                {renderBarChart(dailyData, "carbs", Math.max(...dailyData.map((d) => d.carbs), 1))}
              </TabsContent>
              <TabsContent value="fat">
                {renderBarChart(dailyData, "fat", Math.max(...dailyData.map((d) => d.fat), 1))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dining Hall Frequency</CardTitle>
            <CardDescription>Where you eat most often</CardDescription>
          </CardHeader>
          <CardContent>{renderPieChart(nutritionSummary.diningHallFrequency)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meal Type Distribution</CardTitle>
            <CardDescription>Breakdown by meal type</CardDescription>
          </CardHeader>
          <CardContent>{renderPieChart(nutritionSummary.mealTypeFrequency)}</CardContent>
        </Card>
      </div>
    </div>
  )
}

