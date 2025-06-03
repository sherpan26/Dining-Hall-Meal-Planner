"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Loader2, CalendarIcon, ChevronDown, ChevronUp, ExternalLink, Check } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { EVENTS, dispatchCustomEvent } from "@/lib/events"

// Import dining hall configurations from the scraper
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

interface MenuItem {
  name: string
  category: string
  portion: string
  nutritionLink: string | null
}

interface MenuData {
  diningHall: string
  date: string
  mealPeriod: string
  menuItems: MenuItem[]
  menuByCategory: Record<string, MenuItem[]>
  timestamp: string
  error?: string
}

interface NutritionInfo {
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
  isLoading?: boolean
}

export default function ViewMenu() {
  const { toast } = useToast()
  const [selectedDiningHall, setSelectedDiningHall] = useState<DiningHall>("Busch Dining Hall")
  const [selectedMealPeriod, setSelectedMealPeriod] = useState(DINING_HALLS[selectedDiningHall].mealPeriods[0])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [nutritionInfo, setNutritionInfo] = useState<Record<string, NutritionInfo>>({})
  // Add a state variable to track when a meal is being added
  const [addingMealId, setAddingMealId] = useState<string | null>(null)
  const [addedMealIds, setAddedMealIds] = useState<string[]>([])

  // Helper function to extract numeric value from string with units
  const extractNumericValue = (value: string): number => {
    if (!value) return 0
    // Extract numbers from strings like "10g" or "150 mg"
    const match = value.match(/(\d+(\.\d+)?)/)
    if (!match) return 0

    // Convert to number and ensure it's not NaN
    const num = Number.parseFloat(match[0])
    return isNaN(num) ? 0 : num
  }

  // Function to fetch nutrition info from the API
  const fetchNutritionInfoFromAPI = async (nutritionLink: string): Promise<NutritionInfo | null> => {
    try {
      console.log("Fetching nutrition info from API for link:", nutritionLink)
      const response = await fetch("/api/nutrition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nutritionLink }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch nutrition info")
      }

      const data = await response.json()
      console.log("Received nutrition data from API:", data)
      return data
    } catch (error) {
      console.error("Error fetching nutrition info:", error)
      return null
    }
  }

  // Function to add a meal to meal history
  const addToMealHistory = async (item: MenuItem, cachedInfo?: NutritionInfo) => {
    // Get existing meal history from localStorage
    const savedMeals = localStorage.getItem("mealHistory")
    let meals = []

    if (savedMeals) {
      try {
        meals = JSON.parse(savedMeals).map((meal: any) => ({
          ...meal,
          date: new Date(meal.date),
        }))
      } catch (error) {
        console.error("Error parsing saved meals:", error)
        meals = []
      }
    }

    // If we don't have cached nutrition info and the item has a nutrition link, fetch it
    let info = cachedInfo
    if (!info && item.nutritionLink) {
      console.log("No cached nutrition info, fetching from URL:", item.nutritionLink)
      info = await fetchNutritionInfoFromAPI(item.nutritionLink)

      // If we successfully fetched the info, update the cache
      if (info) {
        setNutritionInfo((prev) => ({
          ...prev,
          [item.name]: {
            ...info!,
            isLoading: false,
          },
        }))
      }
    }

    // Create a new meal object with properly parsed nutrition info
    const newMeal = {
      id: Date.now().toString(),
      date: selectedDate,
      mealType: selectedMealPeriod.toLowerCase().replace("+", " "),
      name: item.name,
      description: `From ${selectedDiningHall}, portion: ${(item.portion || "1 serving").replace(/&nbsp;/g, " ")}`,
      diningHall: selectedDiningHall,
      rating: 0, // Unrated by default
      nutritionalInfo: info
        ? {
            calories: extractNumericValue(info.calories || "0"),
            protein: extractNumericValue(info.protein || "0g"),
            carbs: extractNumericValue(info.totalCarbs || "0g"),
            fat: extractNumericValue(info.totalFat || "0g"),
            // Add additional nutrition details
            saturatedFat: extractNumericValue(info.saturatedFat || "0g"),
            transFat: extractNumericValue(info.transFat || "0g"),
            cholesterol: extractNumericValue(info.cholesterol || "0mg"),
            sodium: extractNumericValue(info.sodium || "0mg"),
            dietaryFiber: extractNumericValue(info.dietaryFiber || "0g"),
            sugars: extractNumericValue(info.sugars || "0g"),
          }
        : {
            // Default values if no nutrition info is available
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
    }

    // Add this after creating the newMeal object
    console.log("Adding meal with nutrition info:", newMeal.nutritionalInfo)

    // Add the new meal to the array
    meals.unshift(newMeal)

    // Save back to localStorage
    localStorage.setItem("mealHistory", JSON.stringify(meals))

    // Dispatch a custom event to notify other components
    dispatchCustomEvent(EVENTS.MEAL_ADDED, newMeal)

    // Show a toast notification
    toast({
      title: "Meal Added",
      description: `${item.name} has been added to your meal history with ${info ? "complete" : "basic"} nutritional information.`,
      action: (
        <ToastAction
          altText="View History"
          onClick={() => {
            // Navigate to meal history tab
            const historyTab = document.querySelector('[value="meal-history"]') as HTMLElement
            if (historyTab) historyTab.click()
          }}
        >
          View History
        </ToastAction>
      ),
    })
  }

  // Function to toggle item expansion
  const toggleItemExpansion = (itemId: string, item: MenuItem) => {
    if (expandedItems.includes(itemId)) {
      setExpandedItems((prev) => prev.filter((id) => id !== itemId))
    } else {
      setExpandedItems((prev) => [...prev, itemId])
      if (item.nutritionLink && !nutritionInfo[item.name]) {
        fetchNutritionInfo(item)
      }
    }
  }

  // Function to fetch nutrition info for an item
  const fetchNutritionInfo = async (item: MenuItem) => {
    if (!item.nutritionLink) return

    // Set loading state for this specific item
    setNutritionInfo((prev) => ({
      ...prev,
      [item.name]: {
        ...prev[item.name],
        isLoading: true,
        itemName: item.name,
        servingSize: "",
        calories: "",
        totalFat: "",
        saturatedFat: "",
        transFat: "",
        cholesterol: "",
        sodium: "",
        totalCarbs: "",
        dietaryFiber: "",
        sugars: "",
        protein: "",
        ingredients: "",
        allergens: "",
        percentDailyValues: {},
      },
    }))

    try {
      const data = await fetchNutritionInfoFromAPI(item.nutritionLink)

      if (data) {
        setNutritionInfo((prev) => ({
          ...prev,
          [item.name]: {
            ...data,
            isLoading: false,
          },
        }))
      } else {
        throw new Error("Failed to fetch nutrition info")
      }
    } catch (error) {
      console.error("Error fetching nutrition info:", error)
      setNutritionInfo((prev) => ({
        ...prev,
        [item.name]: {
          ...prev[item.name],
          isLoading: false,
        },
      }))
    }
  }

  // FoodItem component
  function FoodItem({ item }: { item: MenuItem }) {
    const itemId = `${item.category}-${item.name}`
    const isExpanded = expandedItems.includes(itemId)
    const info = nutritionInfo[item.name]
    const isAddingMeal = addingMealId === itemId

    return (
      <div className="border rounded-lg mb-3 overflow-hidden hover:shadow-md transition-shadow">
        <div
          className="p-4 bg-background hover:bg-muted/20 transition-colors cursor-pointer"
          onClick={() => toggleItemExpansion(itemId, item)}
        >
          <div className="flex justify-between items-center">
            <div className="font-semibold text-lg">{item.name}</div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isAddingMeal}
                className={cn(
                  "transition-all duration-300",
                  addedMealIds.includes(itemId) && "bg-green-500 text-white border-green-500",
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setAddingMealId(itemId)
                  addToMealHistory(item, info).finally(() => {
                    // Show success animation
                    setAddedMealIds((prev) => [...prev, itemId])

                    // Reset the adding state after a short delay for better UX
                    setTimeout(() => setAddingMealId(null), 300)

                    // Reset the success animation after a longer delay
                    setTimeout(() => {
                      setAddedMealIds((prev) => prev.filter((id) => id !== itemId))
                    }, 1500)
                  })
                }}
              >
                {isAddingMeal ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Adding...
                  </>
                ) : addedMealIds.includes(itemId) ? (
                  <>
                    <Check className="mr-2 h-3 w-3 animate-bounce" />
                    Added!
                  </>
                ) : (
                  "Add to Meal History"
                )}
              </Button>
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>

          {item.portion && (
            <div className="text-sm text-muted-foreground mt-1">Portion: {item.portion.replace(/&nbsp;/g, " ")}</div>
          )}

          {isExpanded && (
            <div className="mt-4 pt-4 border-t">
              {item.nutritionLink ? (
                info?.isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : info ? (
                  <div className="space-y-4">
                    <div className="text-xl font-bold">Nutrition Facts</div>
                    <div className="text-sm">Serving Size: {info.servingSize || "1 EACH"}</div>

                    <div className="text-2xl font-bold border-b pb-2">Calories: {info.calories}</div>

                    <div className="space-y-2">
                      {/* Total Fat */}
                      <div className="flex justify-between items-center border-b pb-1">
                        <div className="font-medium">Total Fat: {info.totalFat}</div>
                        <div className="text-right">{info.percentDailyValues["Total Fat"] || "0%"}</div>
                      </div>

                      {/* Saturated Fat - indented */}
                      <div className="flex justify-between items-center pl-4 text-sm">
                        <div>Saturated Fat: {info.saturatedFat}</div>
                        <div className="text-right">{info.percentDailyValues["Saturated Fat"] || "0%"}</div>
                      </div>

                      {/* Trans Fat - indented */}
                      <div className="flex justify-between items-center pl-4 text-sm">
                        <div>Trans Fat: {info.transFat}</div>
                        <div className="text-right">0%</div>
                      </div>

                      {/* Cholesterol */}
                      <div className="flex justify-between items-center border-b pb-1">
                        <div className="font-medium">Cholesterol: {info.cholesterol}</div>
                        <div className="text-right">{info.percentDailyValues["Cholesterol"] || "0%"}</div>
                      </div>

                      {/* Sodium */}
                      <div className="flex justify-between items-center border-b pb-1">
                        <div className="font-medium">Sodium: {info.sodium}</div>
                        <div className="text-right">{info.percentDailyValues["Sodium"] || "0%"}</div>
                      </div>

                      {/* Total Carbs */}
                      <div className="flex justify-between items-center border-b pb-1">
                        <div className="font-medium">Total Carbs: {info.totalCarbs}</div>
                        <div className="text-right">{info.percentDailyValues["Total Carbs"] || "0%"}</div>
                      </div>

                      {/* Dietary Fiber - indented */}
                      <div className="flex justify-between items-center pl-4 text-sm">
                        <div>Dietary Fiber: {info.dietaryFiber}</div>
                        <div className="text-right">{info.percentDailyValues["Dietary Fiber"] || "0%"}</div>
                      </div>

                      {/* Sugars - indented */}
                      <div className="flex justify-between items-center pl-4 text-sm">
                        <div>Sugars: {info.sugars}</div>
                        <div className="text-right"></div>
                      </div>

                      {/* Protein */}
                      <div className="flex justify-between items-center border-b pb-1">
                        <div className="font-medium">Protein: {info.protein}</div>
                        <div className="text-right"></div>
                      </div>
                    </div>

                    {info.ingredients && (
                      <div className="mt-4">
                        <div className="font-semibold">Ingredients:</div>
                        <p className="text-xs mt-1 leading-relaxed">{info.ingredients}</p>
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t">
                      <a
                        href={item.nutritionLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary flex items-center text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Full Nutrition Info
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-2">Loading nutrition information...</div>
                )
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  Nutrition information not available for this item.
                  <div className="mt-2">
                    <a
                      href={`https://menuportal23.dining.rutgers.edu/foodpronet/pickmenu.aspx?locationNum=${
                        DINING_HALLS[selectedDiningHall].locationNum
                      }&locationName=${
                        DINING_HALLS[selectedDiningHall].locationName
                      }&dtdate=${format(selectedDate, "M/d/yyyy")}&activeMeal=${selectedMealPeriod}&sName=Rutgers+University+Dining`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary flex items-center text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View on Menu Page
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Reset expanded categories when menu data changes
  useEffect(() => {
    if (menuData) {
      // Auto-expand the first category
      const categories = Object.keys(menuData.menuByCategory)
      if (categories.length > 0) {
        setExpandedCategories([categories[0]])
      }
    }
  }, [menuData])

  const handleFetchMenu = async () => {
    setLoading(true)
    setError(null)
    setNutritionInfo({})
    setExpandedItems([])

    try {
      // Format date as MM/DD/YYYY
      const formattedDate = `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}/${selectedDate.getFullYear()}`

      const response = await fetch("/api/menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          diningHall: selectedDiningHall,
          date: formattedDate,
          mealPeriod: selectedMealPeriod,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch menu data")
      }

      const data = await response.json()
      setMenuData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Error fetching menu:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Dining Hall</label>
          <Select
            value={selectedDiningHall}
            onValueChange={(value: DiningHall) => {
              setSelectedDiningHall(value)
              setSelectedMealPeriod(DINING_HALLS[value].mealPeriods[0])
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select dining hall" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(DINING_HALLS).map((hall) => (
                <SelectItem key={hall} value={hall}>
                  {hall}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Meal Period</label>
          <Select value={selectedMealPeriod} onValueChange={setSelectedMealPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="Select meal period" />
            </SelectTrigger>
            <SelectContent>
              {DINING_HALLS[selectedDiningHall].mealPeriods.map((period) => (
                <SelectItem key={period} value={period}>
                  {period.replace("+", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Button onClick={handleFetchMenu} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Fetching Menu...
          </>
        ) : (
          "View Menu"
        )}
      </Button>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {menuData && !error && (
        <Card>
          <CardHeader>
            <CardTitle>
              {menuData.diningHall} - {menuData.mealPeriod.replace("+", " ")} - {format(selectedDate, "MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {menuData.menuItems.length === 0 ? (
              <p className="text-muted-foreground">No menu items available for this selection.</p>
            ) : (
              <Accordion
                type="multiple"
                value={expandedCategories}
                onValueChange={setExpandedCategories}
                className="w-full"
              >
                {Object.entries(menuData.menuByCategory).map(([category, items]) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger className="text-lg font-medium">
                      {category} ({items.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1 pt-2">
                        {items.map((item, index) => (
                          <FoodItem key={`${category}-${index}`} item={item} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

