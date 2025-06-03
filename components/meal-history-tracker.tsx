"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Plus, Trash2, Edit } from "lucide-react"
import { cn } from "@/lib/utils"
import { EVENTS, addCustomEventListener, dispatchCustomEvent } from "@/lib/events"

type Meal = {
  id: string
  date: Date
  mealType: string
  name: string
  description: string
  diningHall: string
  rating: number
  nutritionalInfo?: {
    calories: number
    protein: number
    carbs: number
    fat: number
    saturatedFat?: number
    transFat?: number
    cholesterol?: number
    sodium?: number
    dietaryFiber?: number
    sugars?: number
  }
}

export default function MealHistoryTracker() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [date, setDate] = useState<Date>(new Date())
  const [mealType, setMealType] = useState("lunch")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [diningHall, setDiningHall] = useState("The Atrium")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")

  // Function to load meals from localStorage
  const loadMeals = () => {
    const savedMeals = localStorage.getItem("mealHistory")
    if (savedMeals) {
      try {
        const parsedMeals = JSON.parse(savedMeals).map((meal: any) => {
          // Ensure date is properly converted to Date object
          const mealWithDate = {
            ...meal,
            date: new Date(meal.date),
          }

          // Ensure nutritionalInfo is properly formatted with default values if missing
          if (!mealWithDate.nutritionalInfo) {
            mealWithDate.nutritionalInfo = {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
            }
          } else {
            // Ensure all nutritional values are numbers, not strings
            const ensureNumber = (value: any) => (typeof value === "number" ? value : 0)

            mealWithDate.nutritionalInfo = {
              calories: ensureNumber(mealWithDate.nutritionalInfo.calories),
              protein: ensureNumber(mealWithDate.nutritionalInfo.protein),
              carbs: ensureNumber(mealWithDate.nutritionalInfo.carbs),
              fat: ensureNumber(mealWithDate.nutritionalInfo.fat),
              saturatedFat: ensureNumber(mealWithDate.nutritionalInfo.saturatedFat),
              transFat: ensureNumber(mealWithDate.nutritionalInfo.transFat),
              cholesterol: ensureNumber(mealWithDate.nutritionalInfo.cholesterol),
              sodium: ensureNumber(mealWithDate.nutritionalInfo.sodium),
              dietaryFiber: ensureNumber(mealWithDate.nutritionalInfo.dietaryFiber),
              sugars: ensureNumber(mealWithDate.nutritionalInfo.sugars),
            }
          }

          return mealWithDate
        })

        console.log("Loaded meals with nutrition info:", parsedMeals)
        setMeals(parsedMeals)
      } catch (error) {
        console.error("Error parsing saved meals:", error)
        // Add sample meals if parsing fails
        setMeals(getSampleMeals())
        localStorage.setItem("mealHistory", JSON.stringify(getSampleMeals()))
      }
    } else {
      // Add sample meals if no saved meals exist
      const sampleMeals = getSampleMeals()
      setMeals(sampleMeals)
      localStorage.setItem("mealHistory", JSON.stringify(sampleMeals))
    }
  }

  // Load meals from localStorage on component mount
  useEffect(() => {
    loadMeals()

    // Set up event listeners for real-time updates
    const removeAddListener = addCustomEventListener(EVENTS.MEAL_ADDED, (newMeal) => {
      console.log("Meal added event received:", newMeal)
      // Immediately update the meals state with the new meal
      setMeals((prevMeals) => {
        // Ensure the date is a Date object and nutrition values are numbers
        const mealWithDate = {
          ...newMeal,
          date: new Date(newMeal.date),
          nutritionalInfo: newMeal.nutritionalInfo
            ? {
                calories: Number(newMeal.nutritionalInfo.calories || 0),
                protein: Number(newMeal.nutritionalInfo.protein || 0),
                carbs: Number(newMeal.nutritionalInfo.carbs || 0),
                fat: Number(newMeal.nutritionalInfo.fat || 0),
                saturatedFat: Number(newMeal.nutritionalInfo.saturatedFat || 0),
                transFat: Number(newMeal.nutritionalInfo.transFat || 0),
                cholesterol: Number(newMeal.nutritionalInfo.cholesterol || 0),
                sodium: Number(newMeal.nutritionalInfo.sodium || 0),
                dietaryFiber: Number(newMeal.nutritionalInfo.dietaryFiber || 0),
                sugars: Number(newMeal.nutritionalInfo.sugars || 0),
              }
            : {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
              },
        }
        console.log("Processed meal with nutrition:", mealWithDate)
        return [mealWithDate, ...prevMeals]
      })
    })

    const removeUpdateListener = addCustomEventListener(EVENTS.MEAL_UPDATED, (updatedMeal) => {
      console.log("Meal updated event received:", updatedMeal)
      loadMeals() // Reload meals when a meal is updated
    })

    const removeDeleteListener = addCustomEventListener(EVENTS.MEAL_DELETED, (deletedMealId) => {
      console.log("Meal deleted event received:", deletedMealId)
      loadMeals() // Reload meals when a meal is deleted
    })

    // Clean up event listeners on component unmount
    return () => {
      removeAddListener()
      removeUpdateListener()
      removeDeleteListener()
    }
  }, [])

  // Helper function to get sample meals
  const getSampleMeals = () => {
    return [] // Return empty array instead of sample meals
  }

  // Save meals to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("mealHistory", JSON.stringify(meals))
  }, [meals])

  const handleAddMeal = async () => {
    setIsAnalyzing(true)

    try {
      // Simulate nutritional analysis
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Generate estimated nutritional info based on meal type and description
      const nutritionalInfo = generateNutritionalInfo(mealType, description)

      const newMeal: Meal = {
        id: editingMealId || Date.now().toString(),
        date,
        mealType,
        name,
        description,
        diningHall,
        rating: 0, // Default value for backward compatibility
        nutritionalInfo,
      }

      if (editingMealId) {
        // Update existing meal
        setMeals(meals.map((meal) => (meal.id === editingMealId ? newMeal : meal)))
        // Dispatch event for meal updated
        dispatchCustomEvent(EVENTS.MEAL_UPDATED, newMeal)
      } else {
        // Add new meal
        setMeals([...meals, newMeal])
        // Dispatch event for meal added
        dispatchCustomEvent(EVENTS.MEAL_ADDED, newMeal)
      }

      // Reset form
      setName("")
      setDescription("")
      setMealType("lunch")
      setDiningHall("The Atrium")
      setIsDialogOpen(false)
      setEditingMealId(null)
    } catch (error) {
      console.error("Error adding meal:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleEditMeal = (meal: Meal) => {
    setEditingMealId(meal.id)
    setDate(meal.date)
    setMealType(meal.mealType)
    setName(meal.name)
    setDescription(meal.description)
    setDiningHall(meal.diningHall)
    setIsDialogOpen(true)
  }

  const handleDeleteMeal = (id: string) => {
    setMeals(meals.filter((meal) => meal.id !== id))
    // Dispatch event for meal deleted
    dispatchCustomEvent(EVENTS.MEAL_DELETED, id)
  }

  const getMealsByDate = (date: Date) => {
    return meals.filter(
      (meal) =>
        meal.date.getDate() === date.getDate() &&
        meal.date.getMonth() === date.getMonth() &&
        meal.date.getFullYear() === date.getFullYear(),
    )
  }

  // Function to generate nutritional info based on meal type and description
  const generateNutritionalInfo = (mealType: string, description: string) => {
    // Base values by meal type
    const baseValues = {
      breakfast: { calories: 350, protein: 15, carbs: 45, fat: 12 },
      lunch: { calories: 550, protein: 25, carbs: 65, fat: 20 },
      dinner: { calories: 650, protein: 35, carbs: 70, fat: 25 },
      snack: { calories: 200, protein: 8, carbs: 25, fat: 8 },
    }

    // Get base values for the meal type
    const base = baseValues[mealType as keyof typeof baseValues] || baseValues.lunch

    // Adjust based on keywords in description
    const lowerDesc = description.toLowerCase()
    const modifier = { calories: 0, protein: 0, carbs: 0, fat: 0 }

    // Protein-rich foods
    if (
      lowerDesc.includes("chicken") ||
      lowerDesc.includes("beef") ||
      lowerDesc.includes("fish") ||
      lowerDesc.includes("turkey") ||
      lowerDesc.includes("protein")
    ) {
      modifier.protein += 10
      modifier.calories += 50
    }

    // Carb-rich foods
    if (
      lowerDesc.includes("pasta") ||
      lowerDesc.includes("rice") ||
      lowerDesc.includes("bread") ||
      lowerDesc.includes("potato") ||
      lowerDesc.includes("carb")
    ) {
      modifier.carbs += 15
      modifier.calories += 70
    }

    // Fat-rich foods
    if (
      lowerDesc.includes("cheese") ||
      lowerDesc.includes("butter") ||
      lowerDesc.includes("oil") ||
      lowerDesc.includes("fried") ||
      lowerDesc.includes("fat")
    ) {
      modifier.fat += 8
      modifier.calories += 90
    }

    // Vegetable-rich foods (lower calories)
    if (
      lowerDesc.includes("salad") ||
      lowerDesc.includes("vegetable") ||
      lowerDesc.includes("vegan") ||
      lowerDesc.includes("veggie")
    ) {
      modifier.calories -= 100
      modifier.carbs -= 10
      modifier.fat -= 5
    }

    // Add some randomness
    const randomize = (value: number) => {
      const variation = Math.floor(Math.random() * 20) - 10 // -10 to +10
      return Math.max(value + variation, 0)
    }

    return {
      calories: randomize(base.calories + modifier.calories),
      protein: randomize(base.protein + modifier.protein),
      carbs: randomize(base.carbs + modifier.carbs),
      fat: randomize(base.fat + modifier.fat),
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "list" | "calendar")}>
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Meal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingMealId ? "Edit Meal" : "Add New Meal"}</DialogTitle>
              <DialogDescription>Record what you ate to track your nutrition and dining habits.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mealType">Meal Type</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Meal Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Grilled Chicken Sandwich"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Grilled chicken with lettuce, tomato, and mayo on whole wheat bread"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="diningHall">Dining Hall</Label>
                <Select value={diningHall} onValueChange={setDiningHall}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dining hall" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="The Atrium">The Atrium</SelectItem>
                    <SelectItem value="Busch Dining Hall">Busch Dining Hall</SelectItem>
                    <SelectItem value="Livingston Dining Hall">Livingston Dining Hall</SelectItem>
                    <SelectItem value="Neilson Dining Hall">Neilson Dining Hall</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddMeal} disabled={isAnalyzing}>
                {isAnalyzing ? "Analyzing..." : editingMealId ? "Update Meal" : "Add Meal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {viewMode === "list" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meals.length > 0 ? (
            meals
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .map((meal) => (
                <Card key={meal.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <div>
                        <CardTitle>{meal.name}</CardTitle>
                        <CardDescription>
                          {format(meal.date, "PPP")} • {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">{meal.description.replace(/&nbsp;/g, " ")}</p>
                    <p className="text-sm text-muted-foreground">{meal.diningHall}</p>

                    {meal.nutritionalInfo && (
                      <div className="mt-2">
                        <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                          <div className="bg-muted p-1 rounded text-center">
                            <div className="font-medium">{meal.nutritionalInfo.calories}</div>
                            <div className="text-muted-foreground">Cal</div>
                          </div>
                          <div className="bg-muted p-1 rounded text-center">
                            <div className="font-medium">{meal.nutritionalInfo.protein}g</div>
                            <div className="text-muted-foreground">Protein</div>
                          </div>
                          <div className="bg-muted p-1 rounded text-center">
                            <div className="font-medium">{meal.nutritionalInfo.carbs}g</div>
                            <div className="text-muted-foreground">Carbs</div>
                          </div>
                          <div className="bg-muted p-1 rounded text-center">
                            <div className="font-medium">{meal.nutritionalInfo.fat}g</div>
                            <div className="text-muted-foreground">Fat</div>
                          </div>
                        </div>

                        {/* Show additional nutrition info if available */}
                        {(meal.nutritionalInfo.saturatedFat ||
                          meal.nutritionalInfo.sodium ||
                          meal.nutritionalInfo.sugars) && (
                          <details className="text-xs mt-1">
                            <summary className="cursor-pointer text-primary">More nutrition details</summary>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {meal.nutritionalInfo.saturatedFat !== undefined && (
                                <div className="bg-muted/50 p-1 rounded text-center">
                                  <div className="font-medium">{meal.nutritionalInfo.saturatedFat}g</div>
                                  <div className="text-muted-foreground">Sat. Fat</div>
                                </div>
                              )}
                              {meal.nutritionalInfo.sodium !== undefined && (
                                <div className="bg-muted/50 p-1 rounded text-center">
                                  <div className="font-medium">{meal.nutritionalInfo.sodium}mg</div>
                                  <div className="text-muted-foreground">Sodium</div>
                                </div>
                              )}
                              {meal.nutritionalInfo.sugars !== undefined && (
                                <div className="bg-muted/50 p-1 rounded text-center">
                                  <div className="font-medium">{meal.nutritionalInfo.sugars}g</div>
                                  <div className="text-muted-foreground">Sugars</div>
                                </div>
                              )}
                              {meal.nutritionalInfo.dietaryFiber !== undefined && (
                                <div className="bg-muted/50 p-1 rounded text-center">
                                  <div className="font-medium">{meal.nutritionalInfo.dietaryFiber}g</div>
                                  <div className="text-muted-foreground">Fiber</div>
                                </div>
                              )}
                              {meal.nutritionalInfo.cholesterol !== undefined && (
                                <div className="bg-muted/50 p-1 rounded text-center">
                                  <div className="font-medium">{meal.nutritionalInfo.cholesterol}mg</div>
                                  <div className="text-muted-foreground">Chol.</div>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2 pt-0">
                    <Button variant="outline" size="icon" onClick={() => handleEditMeal(meal)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDeleteMeal(meal.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-12 bg-muted rounded-lg">
              <p className="text-muted-foreground mb-4">No meals recorded yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Meal
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-lg p-6 border">
          <div className="mb-6">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => date && setDate(date)}
              className="rounded-md border"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Meals for {format(date, "MMMM d, yyyy")}</h3>

            {getMealsByDate(date).length > 0 ? (
              getMealsByDate(date).map((meal) => (
                <Card key={meal.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <div>
                        <CardTitle>{meal.name}</CardTitle>
                        <CardDescription>
                          {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">{meal.description.replace(/&nbsp;/g, " ")}</p>
                    <p className="text-sm text-muted-foreground">{meal.diningHall}</p>

                    {meal.nutritionalInfo && (
                      <div className="mt-2">
                        <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                          <div className="bg-muted p-1 rounded text-center">
                            <div className="font-medium">{meal.nutritionalInfo.calories}</div>
                            <div className="text-muted-foreground">Cal</div>
                          </div>
                          <div className="bg-muted p-1 rounded text-center">
                            <div className="font-medium">{meal.nutritionalInfo.protein}g</div>
                            <div className="text-muted-foreground">Protein</div>
                          </div>
                          <div className="bg-muted p-1 rounded text-center">
                            <div className="font-medium">{meal.nutritionalInfo.carbs}g</div>
                            <div className="text-muted-foreground">Carbs</div>
                          </div>
                          <div className="bg-muted p-1 rounded text-center">
                            <div className="font-medium">{meal.nutritionalInfo.fat}g</div>
                            <div className="text-muted-foreground">Fat</div>
                          </div>
                        </div>

                        {/* Show additional nutrition info if available */}
                        {(meal.nutritionalInfo.saturatedFat ||
                          meal.nutritionalInfo.sodium ||
                          meal.nutritionalInfo.sugars) && (
                          <details className="text-xs mt-1">
                            <summary className="cursor-pointer text-primary">More nutrition details</summary>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {meal.nutritionalInfo.saturatedFat !== undefined && (
                                <div className="bg-muted/50 p-1 rounded text-center">
                                  <div className="font-medium">{meal.nutritionalInfo.saturatedFat}g</div>
                                  <div className="text-muted-foreground">Sat. Fat</div>
                                </div>
                              )}
                              {meal.nutritionalInfo.sodium !== undefined && (
                                <div className="bg-muted/50 p-1 rounded text-center">
                                  <div className="font-medium">{meal.nutritionalInfo.sodium}mg</div>
                                  <div className="text-muted-foreground">Sodium</div>
                                </div>
                              )}
                              {meal.nutritionalInfo.sugars !== undefined && (
                                <div className="bg-muted/50 p-1 rounded text-center">
                                  <div className="font-medium">{meal.nutritionalInfo.sugars}g</div>
                                  <div className="text-muted-foreground">Sugars</div>
                                </div>
                              )}
                              {meal.nutritionalInfo.dietaryFiber !== undefined && (
                                <div className="bg-muted/50 p-1 rounded text-center">
                                  <div className="font-medium">{meal.nutritionalInfo.dietaryFiber}g</div>
                                  <div className="text-muted-foreground">Fiber</div>
                                </div>
                              )}
                              {meal.nutritionalInfo.cholesterol !== undefined && (
                                <div className="bg-muted/50 p-1 rounded text-center">
                                  <div className="font-medium">{meal.nutritionalInfo.cholesterol}mg</div>
                                  <div className="text-muted-foreground">Chol.</div>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2 pt-0">
                    <Button variant="outline" size="icon" onClick={() => handleEditMeal(meal)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDeleteMeal(meal.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
                <p className="text-muted-foreground mb-4">No meals recorded for this date</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Meal
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

