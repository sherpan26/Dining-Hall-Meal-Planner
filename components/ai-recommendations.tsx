"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Send, AlertCircle, Trash2, Download, History } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { Progress } from "@/components/ui/progress"

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

interface MenuItem {
  name: string
  category: string
  portion: string
  nutritionLink: string | null
  nutritionInfo?: {
    calories: string
    protein: string
    carbs: string
    fat: string
    [key: string]: string
  }
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

type Message = {
  id: string
  content: string
  role: "user" | "assistant" | "system"
  formattedContent?: React.ReactNode
  timestamp?: number
}

type ChatSession = {
  id: string
  name: string
  diningHall: string
  mealPeriod: string
  date: string
  messages: Message[]
  lastUpdated: number
}

// Cache for nutrition info to avoid repeated fetches
const nutritionCache: Record<string, any> = {}

export default function AIRecommendations() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hi there! I'm your Rutgers Dining AI assistant. Please select a dining hall and meal period, then click 'Load Menu' to get started.",
      role: "assistant",
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDiningHall, setSelectedDiningHall] = useState<DiningHall | "">("")
  const [selectedMealPeriod, setSelectedMealPeriod] = useState<string>("")
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [isMenuLoading, setIsMenuLoading] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState("")

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Effect to update meal period when dining hall changes
  useEffect(() => {
    if (selectedDiningHall) {
      setSelectedMealPeriod(DINING_HALLS[selectedDiningHall].mealPeriods[0])
    } else {
      setSelectedMealPeriod("")
    }
  }, [selectedDiningHall])

  // Load saved chat sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem("chatSessions")
    if (savedSessions) {
      try {
        setChatSessions(JSON.parse(savedSessions))
      } catch (error) {
        console.error("Error loading saved chat sessions:", error)
      }
    }
  }, [])

  // Function to fetch nutrition info for a menu item
  const fetchNutritionInfo = async (item: MenuItem): Promise<MenuItem> => {
    if (!item.nutritionLink) return item

    // Check cache first
    if (nutritionCache[item.name]) {
      return {
        ...item,
        nutritionInfo: nutritionCache[item.name],
      }
    }

    try {
      const response = await fetch("/api/nutrition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nutritionLink: item.nutritionLink }),
      })

      if (response.ok) {
        const data = await response.json()
        const nutritionInfo = {
          calories: data.calories || "0",
          protein: data.protein || "0g",
          carbs: data.totalCarbs || "0g",
          fat: data.totalFat || "0g",
          saturatedFat: data.saturatedFat || "0g",
          sodium: data.sodium || "0mg",
          sugars: data.sugars || "0g",
          fiber: data.dietaryFiber || "0g",
        }

        // Store in cache
        nutritionCache[item.name] = nutritionInfo

        return {
          ...item,
          nutritionInfo,
        }
      }
    } catch (error) {
      console.error("Error fetching nutrition for item:", item.name, error)
    }

    return item
  }

  // Modified function to fetch menu data without nutrition info
  const fetchMenuData = async () => {
    if (!selectedDiningHall || !selectedMealPeriod) {
      setMenuError("Please select both a dining hall and meal period")
      return
    }

    console.log(`Fetching menu data for ${selectedDiningHall}, ${selectedMealPeriod}`)

    setIsMenuLoading(true)
    setMenuError(null)
    setApiError(null)
    setLoadingProgress(0)
    setLoadingStage("Initializing...")

    try {
      // Format date as MM/DD/YYYY
      const today = new Date()
      const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`

      // Start progress simulation for initial fetch
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev < 50) return prev + 2
          return prev
        })
      }, 100)

      setLoadingStage("Fetching menu data...")

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

      clearInterval(progressInterval)
      setLoadingProgress(70)
      setLoadingStage("Processing menu data...")

      if (!response.ok) {
        throw new Error("Failed to fetch menu data")
      }

      const data = await response.json()

      console.log(
        `Menu data fetched: ${data.menuItems.length} items across ${Object.keys(data.menuByCategory).length} categories`,
      )

      // Skip nutrition fetching - we'll do it on demand later
      setLoadingProgress(90)
      setLoadingStage("Finalizing...")

      // Short delay to show the final progress stage
      await new Promise((resolve) => setTimeout(resolve, 300))

      setLoadingProgress(100)
      setMenuData(data)

      // Create a new session
      const sessionId = Date.now().toString()
      setCurrentSessionId(sessionId)

      // Add a message from the assistant about the loaded menu
      const menuLoadedMessage: Message = {
        id: Date.now().toString(),
        content: `I've loaded today's menu for ${selectedDiningHall} (${selectedMealPeriod.replace("+", " ")}). How can I help you? You can ask about meal recommendations or dietary preferences.`,
        role: "assistant",
        timestamp: Date.now(),
      }

      // After setting messages in fetchMenuData:
      const initialMessages = [
        {
          id: "1",
          content: "Hi there! I'm your Rutgers Dining AI assistant. How can I help you today?",
          role: "assistant",
          timestamp: Date.now() - 1000,
        },
        menuLoadedMessage,
      ]
      setMessages(initialMessages)
      autoSaveSession(initialMessages)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred"
      setMenuError(errorMsg)
      console.error("Error fetching menu:", err)

      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `I couldn't load the menu data. Please try again or select a different dining hall.`,
        role: "assistant",
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      // Ensure we complete the progress bar even on error
      if (loadingProgress < 100) {
        setLoadingProgress(100)
        // Small delay before hiding the loading indicator
        setTimeout(() => setIsMenuLoading(false), 300)
      } else {
        setIsMenuLoading(false)
      }
    }
  }

  // Function to create a menu summary with only food names (no nutrition info)
  const createMenuSummary = () => {
    if (!menuData) return ""

    console.log(`Creating menu summary from ${menuData?.menuItems.length} items (without nutrition info)`)

    let menuSummary = `Menu at ${menuData.diningHall} (${menuData.mealPeriod.replace("+", " ")}):\n\n`

    // Get all categories
    const categories = Object.keys(menuData.menuByCategory)

    categories.forEach((category) => {
      menuSummary += `${category}:\n`

      // Get all items in this category
      const items = menuData.menuByCategory[category]

      // Include names only (no nutrition info)
      items.forEach((item) => {
        menuSummary += `- ${item.name}\n`
      })

      menuSummary += "\n"
    })

    console.log(`Menu summary created (${menuSummary.length} characters):\n${menuSummary.substring(0, 200)}...`)
    return menuSummary
  }

  // Function to format nutrition values in a more readable way
  const formatNutritionValue = (text: string) => {
    // Match patterns like "Calories: 365" or "Protein: 15.6g"
    const nutritionRegex = /(Calories|Protein|Carbs|Fat|Carbohydrates|Sodium|Sugar|Fiber):\s*(\d+\.?\d*)([a-zA-Z%]*)/g

    let formattedText = text
    let match

    // Replace each nutrition value with a badge
    while ((match = nutritionRegex.exec(text)) !== null) {
      const fullMatch = match[0]
      const nutrient = match[1]
      const value = match[2]
      const unit = match[3] || ""

      // Create a replacement with a badge
      const replacement = `<nutrition-badge type="${nutrient.toLowerCase()}" value="${value}${unit}"></nutrition-badge>`

      // Replace in the formatted text
      formattedText = formattedText.replace(fullMatch, replacement)
    }

    return formattedText
  }

  // Update the formatAIResponse function to better handle bullet points

  // Replace the existing formatAIResponse function with this improved version
  const formatAIResponse = (content: string) => {
    // First, clean up any extra asterisks, parentheses, and commas that make the output messy
    let formattedContent = content
      .replace(/\(\s*\(/g, "(")
      .replace(/\)\s*\)/g, ")")
      .replace(/,\s*,/g, ",")
      .replace(/\*\*\s*\*\*/g, "**")
      .replace(/\(\s*,/g, "(")
      .replace(/,\s*\)/g, ")")
      .replace(/\*\s*\*/g, "*")

    // Format food option headers (e.g., **Option 1: Bagel with Cottage Cheese**)
    formattedContent = formattedContent.replace(
      /\*\*Option (\d+):(.*?)\*\*/g,
      "<food-option>Option $1:$2</food-option>",
    )

    // Format food item names (e.g., **Plain Bagels:**)
    formattedContent = formattedContent.replace(/\*\*([\w\s&+'-]+):\*\*/g, "<food-item>$1:</food-item>")

    // Format food items with nutrition info
    // This pattern looks for **Item** followed by nutrition info in parentheses
    formattedContent = formattedContent.replace(
      /\*\*([\w\s&+'-]+)\*\*\s*$$(Calories:[^)]+)$$/g,
      "<food-item-with-nutrition>$1</food-item-with-nutrition><nutrition-info>$2</nutrition-info>",
    )

    // Handle food items without nutrition info
    formattedContent = formattedContent.replace(
      /\*\*([\w\s&+'-]+)\*\*/g,
      "<food-item-with-nutrition>$1</food-item-with-nutrition>",
    )

    // Format protein totals
    formattedContent = formattedContent.replace(/\*\*(\d+\.?\d*g of protein)\*\*/g, "<protein-total>$1</protein-total>")
    formattedContent = formattedContent.replace(
      /Total Protein:?\s*(\d+\.?\d*g)(?:\s*of protein)?/gi,
      "<protein-total>$1 of protein</protein-total>",
    )

    // Extract and format nutrition information in parentheses
    formattedContent = formattedContent.replace(
      /$$Calories:\s*(\d+\.?\d*)(?:g|cal)?(?:,\s*|\s+)Protein:\s*(\d+\.?\d*)g?(?:,\s*|\s+)Carbs:\s*(\d+\.?\d*)g?(?:,\s*|\s+)Fat:\s*(\d+\.?\d*)g?$$/g,
      (match, calories, protein, carbs, fat) => {
        let result = "<nutrition-group>"
        if (calories) result += `<nutrition-badge type="calories" value="${calories}"></nutrition-badge>`
        if (protein) result += `<nutrition-badge type="protein" value="${protein}g"></nutrition-badge>`
        if (carbs) result += `<nutrition-badge type="carbs" value="${carbs}g"></nutrition-badge>`
        if (fat) result += `<nutrition-badge type="fat" value="${fat}g"></nutrition-badge>`
        result += "</nutrition-group>"
        return result
      },
    )

    // Format meal totals
    formattedContent = formattedContent.replace(
      /(?:Meal )?Total:?\s*(?:Calories:?\s*(\d+\.?\d*)(?:g|cal)?)?(?:,?\s*Protein:?\s*(\d+\.?\d*)g?)?(?:,?\s*Carbs?:?\s*(\d+\.?\d*)g?)?(?:,?\s*Fat:?\s*(\d+\.?\d*)g?)?/gi,
      (match, calories, protein, carbs, fat) => {
        let result = "<meal-total>"
        if (calories) result += `<nutrition-badge type="calories" value="${calories}"></nutrition-badge>`
        if (protein) result += `<nutrition-badge type="protein" value="${protein}g"></nutrition-badge>`
        if (carbs) result += `<nutrition-badge type="carbs" value="${carbs}g"></nutrition-badge>`
        if (fat) result += `<nutrition-badge type="fat" value="${fat}g"></nutrition-badge>`
        result += "</meal-total>"
        return result
      },
    )

    // Preserve line breaks in the original text by converting them to <line-break> tags
    formattedContent = formattedContent.replace(/\n/g, "<line-break>")

    return formattedContent
  }

  // Update the renderFormattedContent function to handle the new food-item-with-nutrition tag
  const renderFormattedContent = (formattedContent: string) => {
    let currentElement: React.ReactNode = ""
    let inTag = false
    const elements: React.ReactNode[] = []

    if (
      !formattedContent.includes("<") &&
      !formattedContent.includes("•") &&
      !formattedContent.includes("<line-break>")
    ) {
      return <p>{formattedContent}</p>
    }

    // If we have bullet points but no tags, handle them specially
    if (
      !formattedContent.includes("<") &&
      (formattedContent.includes("•") || formattedContent.includes("<line-break>"))
    ) {
      // Split by line breaks first
      const lines = formattedContent.split("<line-break>")

      return (
        <div className="space-y-1">
          {lines.map((line, lineIndex) => {
            if (!line.trim()) return <div key={`empty-${lineIndex}`} className="h-2" />

            if (line.includes("•")) {
              const bulletParts = line.split(/(\s*•\s+[^•]+)/).filter(Boolean)
              return (
                <div key={`line-${lineIndex}`}>
                  {bulletParts.map((part, index) => {
                    if (part.trim().startsWith("•")) {
                      return (
                        <div key={`bullet-${lineIndex}-${index}`} className="flex items-start ml-2 mb-1">
                          <span className="mr-2 text-primary">•</span>
                          <span>{part.replace(/^\s*•\s+/, "")}</span>
                        </div>
                      )
                    }
                    return <span key={`text-${lineIndex}-${index}`}>{part}</span>
                  })}
                </div>
              )
            }
            return <div key={`line-${lineIndex}`}>{line}</div>
          })}
        </div>
      )
    }

    // Split the content by custom tags and line breaks
    const parts = formattedContent.split(
      /(<\/?(?:nutrition-badge|nutrition-group|food-option|food-item|food-item-with-nutrition|nutrition-info|protein-total|meal-total|line-break)[^>]*>)/,
    )

    // Process the parts and convert to React elements
    let tagType = ""
    let tagProps: Record<string, string> = {}
    let nutritionGroup: React.ReactNode[] = []
    let currentFoodItem = ""

    parts.forEach((part, index) => {
      // Handle line breaks
      if (part === "<line-break>") {
        elements.push(<br key={`br-${index}`} />)
        return
      }

      // Opening tag
      if (part.startsWith("<") && !part.startsWith("</")) {
        inTag = true

        // Extract tag type and props
        const tagMatch = part.match(/<([a-z-]+)([^>]*)>/)
        if (tagMatch) {
          tagType = tagMatch[1]

          // Extract props if any
          const propsStr = tagMatch[2]
          const propsMatches = Array.from(propsStr.matchAll(/([a-z-]+)="([^"]*)"/g))
          tagProps = {}

          for (const propMatch of propsMatches) {
            tagProps[propMatch[1]] = propMatch[2]
          }

          // If there was content before this tag, add it
          if (currentElement && typeof currentElement === "string") {
            // Process any bullet points in the text
            if (currentElement.includes("•")) {
              const bulletParts = currentElement.split(/(\s*•\s+[^•]+)/).filter(Boolean)
              bulletParts.forEach((bulletPart, bpIndex) => {
                if (bulletPart.trim().startsWith("•")) {
                  elements.push(
                    <div key={`bullet-${index}-${bpIndex}`} className="flex items-start ml-2 mb-1">
                      <span className="mr-2 text-primary">•</span>
                      <span>{bulletPart.replace(/^\s*•\s+/, "")}</span>
                    </div>,
                  )
                } else {
                  elements.push(<span key={`text-${index}-${bpIndex}`}>{bulletPart}</span>)
                }
              })
            } else {
              elements.push(<span key={`text-${index}`}>{currentElement}</span>)
            }
            currentElement = ""
          }
        }
      }
      // Closing tag
      else if (part.startsWith("</")) {
        inTag = false

        // Render the appropriate component based on tag type
        if (tagType === "nutrition-badge") {
          const type = tagProps.type || ""
          const value = tagProps.value || ""

          // Choose color based on nutrient type
          let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default"
          let badgeClass = "mx-1 my-1 whitespace-nowrap"

          if (type.includes("protein")) {
            badgeVariant = "default"
            badgeClass += " bg-zinc-900 text-white"
          } else if (type.includes("carb")) {
            badgeVariant = "secondary"
          } else if (type.includes("fat")) {
            badgeVariant = "destructive"
          } else if (type.includes("calorie")) {
            badgeVariant = "outline"
            badgeClass += " bg-gray-100"
          }

          const badge = (
            <Badge key={`nutrition-${index}`} variant={badgeVariant} className={badgeClass}>
              {type.charAt(0).toUpperCase() + type.slice(1)}: {value}
            </Badge>
          )

          if (tagType === "nutrition-group") {
            nutritionGroup.push(badge)
          } else {
            elements.push(badge)
          }
        } else if (tagType === "nutrition-group") {
          elements.push(
            <div key={`group-${index}`} className="flex flex-wrap gap-2 my-2">
              {nutritionGroup}
            </div>,
          )
          nutritionGroup = []
        } else if (tagType === "food-option") {
          elements.push(
            <h3 key={`option-${index}`} className="text-lg font-bold mt-6 mb-3 border-b pb-2">
              {currentElement}
            </h3>,
          )
          currentElement = ""
        } else if (tagType === "food-item") {
          elements.push(
            <div key={`item-${index}`} className="font-semibold mt-4 mb-2 text-primary">
              {currentElement}
            </div>,
          )
          currentElement = ""
        } else if (tagType === "food-item-with-nutrition") {
          currentFoodItem = currentElement as string
          // We'll render this when we get the nutrition info or at the end if there's no nutrition info
          if (!parts[index + 1]?.includes("<nutrition-info>")) {
            elements.push(
              <div key={`food-item-${index}`} className="flex items-start ml-2 mb-1">
                <span className="mr-2 text-primary">•</span>
                <span>{currentFoodItem}</span>
              </div>,
            )
          }
          currentElement = ""
        } else if (tagType === "nutrition-info") {
          // Parse the nutrition info
          const nutritionText = currentElement as string
          const nutritionParts = nutritionText.split(/,\s*/).map((part) => part.trim())

          // Create badges for each nutrition part
          const nutritionBadges = nutritionParts.map((part, i) => {
            const [type, value] = part.split(":").map((s) => s.trim())
            let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline"

            if (type.toLowerCase().includes("protein")) {
              badgeVariant = "default"
            } else if (type.toLowerCase().includes("carb")) {
              badgeVariant = "secondary"
            } else if (type.toLowerCase().includes("fat")) {
              badgeVariant = "destructive"
            }

            return (
              <Badge key={`nutrition-${index}-${i}`} variant={badgeVariant} className="mx-1 my-1 whitespace-nowrap">
                {type}: {value}
              </Badge>
            )
          })

          // Render the food item with its nutrition info
          elements.push(
            <div key={`food-item-${index}`} className="flex flex-col ml-2 mb-2">
              <div className="flex items-start">
                <span className="mr-2 text-primary">•</span>
                <span className="font-medium">{currentFoodItem}</span>
              </div>
              <div className="flex flex-wrap ml-6 mt-1">{nutritionBadges}</div>
            </div>,
          )

          currentElement = ""
        } else if (tagType === "protein-total") {
          elements.push(
            <div key={`protein-${index}`} className="mt-3 mb-4 font-bold bg-gray-200 p-3 rounded-md text-center">
              <span>Total Protein: {currentElement}</span>
            </div>,
          )
          currentElement = ""
        } else if (tagType === "meal-total") {
          elements.push(
            <div key={`meal-total-${index}`} className="mt-4 mb-5 bg-muted p-4 rounded-md">
              <div className="text-sm font-medium mb-2">Meal Total:</div>
              <div className="flex flex-wrap gap-2">{nutritionGroup}</div>
            </div>,
          )
          nutritionGroup = []
          currentElement = ""
        }

        tagType = ""
        tagProps = {}
      }
      // Content between tags or plain text
      else {
        if (inTag) {
          currentElement += part
        } else {
          // If this is plain text, check for bullet points and line breaks
          if (part.trim()) {
            if (part.includes("•")) {
              const bulletParts = part.split(/(\s*•\s+[^•]+)/).filter(Boolean)
              bulletParts.forEach((bulletPart, bpIndex) => {
                if (bulletPart.trim().startsWith("•")) {
                  elements.push(
                    <div key={`bullet-${index}-${bpIndex}`} className="flex items-start ml-2 mb-1">
                      <span className="mr-2 text-primary">•</span>
                      <span>{bulletPart.replace(/^\s*•\s+/, "")}</span>
                    </div>,
                  )
                } else {
                  elements.push(<span key={`text-${index}-${bpIndex}`}>{bulletPart}</span>)
                }
              })
            } else {
              elements.push(<span key={`text-${index}`}>{part}</span>)
            }
          }
        }
      }
    })

    // Add any remaining text
    if (currentElement && !inTag) {
      // Process any bullet points in the remaining text
      if (currentElement.includes("•")) {
        const bulletParts = currentElement.split(/(\s*•\s+[^•]+)/).filter(Boolean)
        bulletParts.forEach((bulletPart, bpIndex) => {
          if (bulletPart.trim().startsWith("•")) {
            elements.push(
              <div key={`bullet-final-${bpIndex}`} className="flex items-start ml-2 mb-1">
                <span className="mr-2 text-primary">•</span>
                <span>{bulletPart.replace(/^\s*•\s+/, "")}</span>
              </div>,
            )
          } else {
            elements.push(<span key={`text-final-${bpIndex}`}>{bulletPart}</span>)
          }
        })
      } else {
        elements.push(<span key="text-final">{currentElement}</span>)
      }
    }

    return <div className="space-y-1">{elements}</div>
  }

  // Add this autoSaveSession function
  const autoSaveSession = (updatedMessages: Message[]) => {
    if (!menuData || !currentSessionId) return

    const today = new Date()
    const formattedDate = format(today, "yyyy-MM-dd")

    const sessionName = `Chat - ${selectedDiningHall} (${selectedMealPeriod.replace("+", " ")})`

    const newSession: ChatSession = {
      id: currentSessionId,
      name: sessionName,
      diningHall: selectedDiningHall as string,
      mealPeriod: selectedMealPeriod,
      date: formattedDate,
      messages: updatedMessages,
      lastUpdated: Date.now(),
    }

    const updatedSessions = [...chatSessions.filter((s) => s.id !== currentSessionId), newSession]
    setChatSessions(updatedSessions)
    localStorage.setItem("chatSessions", JSON.stringify(updatedSessions))
  }

  // Load a saved chat session
  const loadChatSession = (sessionId: string) => {
    const session = chatSessions.find((s) => s.id === sessionId)
    if (!session) return

    setMessages(session.messages)
    setSelectedDiningHall(session.diningHall as DiningHall)
    setSelectedMealPeriod(session.mealPeriod)
    setCurrentSessionId(session.id)

    // We need to fetch the menu data again
    const today = new Date()
    const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`

    setIsMenuLoading(true)
    fetch("/api/menu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        diningHall: session.diningHall,
        date: formattedDate,
        mealPeriod: session.mealPeriod,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch menu data")
        return response.json()
      })
      .then((data) => {
        setMenuData(data)
      })
      .catch((error) => {
        console.error("Error loading session menu:", error)
        setMenuError("Could not load menu data for this session")
      })
      .finally(() => {
        setIsMenuLoading(false)
        setShowHistoryDialog(false)
      })
  }

  // Delete a saved chat session
  const deleteChatSession = (sessionId: string) => {
    const updatedSessions = chatSessions.filter((s) => s.id !== sessionId)
    setChatSessions(updatedSessions)
    localStorage.setItem("chatSessions", JSON.stringify(updatedSessions))
  }

  // Export chat as JSON
  const exportChat = (sessionId: string) => {
    const session = chatSessions.find((s) => s.id === sessionId)
    if (!session) return

    const dataStr = JSON.stringify(session, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportName = `${session.name.replace(/\s+/g, "_")}_${session.date}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportName)
    linkElement.click()
  }

  // Function to extract food items from AI response
  const extractFoodItemsFromResponse = (text: string): string[] => {
    const foodItems: string[] = []

    // Look for patterns like "**Food Item:**" or "*Food Item:*"
    const foodItemRegex = /\*\*([\w\s&+'-]+):\*\*|\*([\w\s&+'-]+):\*/g
    let match

    while ((match = foodItemRegex.exec(text)) !== null) {
      const itemName = match[1] || match[2]
      if (itemName) {
        foodItems.push(itemName.trim())
      }
    }

    return foodItems
  }

  // Function to find menu items by name
  const findMenuItemsByName = (names: string[]): MenuItem[] => {
    if (!menuData) return []

    const items: MenuItem[] = []
    const allMenuItems = menuData.menuItems

    // For each name, find the closest matching menu item
    names.forEach((name) => {
      // Try exact match first
      let item = allMenuItems.find((item) => item.name.toLowerCase() === name.toLowerCase())

      // If no exact match, try partial match
      if (!item) {
        item = allMenuItems.find(
          (item) =>
            item.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(item.name.toLowerCase()),
        )
      }

      if (item) {
        items.push(item)
      }
    })

    return items
  }

  // Function to enrich AI response with nutrition info
  const enrichResponseWithNutrition = async (text: string): Promise<string> => {
    // Extract food items from the response
    const foodItemNames = extractFoodItemsFromResponse(text)

    if (foodItemNames.length === 0) {
      return text
    }

    console.log(`Found ${foodItemNames.length} food items in AI response:`, foodItemNames)

    // Find corresponding menu items
    const menuItems = findMenuItemsByName(foodItemNames)
    console.log(`Matched ${menuItems.length} menu items`)

    // Fetch nutrition info for each item
    const itemsWithNutrition = await Promise.all(menuItems.map((item) => fetchNutritionInfo(item)))

    // Create a map of item names to their nutrition info
    const nutritionMap: Record<string, any> = {}
    itemsWithNutrition.forEach((item) => {
      if (item.nutritionInfo) {
        nutritionMap[item.name] = item.nutritionInfo
      }
    })

    // Enrich the response with nutrition info
    let enrichedText = text

    // For each food item in the response, add nutrition info if not already present
    foodItemNames.forEach((itemName) => {
      const regex = new RegExp(`\\*\\*(${itemName}):\\*\\*(?!.*\\(Calories:)`, "i")
      const match = regex.exec(enrichedText)

      if (match && nutritionMap[itemName]) {
        const nutrition = nutritionMap[itemName]
        const nutritionText = ` (Calories: ${nutrition.calories}, Protein: ${nutrition.protein}, Carbs: ${nutrition.carbs}, Fat: ${nutrition.fat})`

        // Replace the item with the item + nutrition info
        enrichedText = enrichedText.replace(match[0], `**${itemName}:**${nutritionText}`)
      }
    })

    return enrichedText
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !menuData) return

    // Reset any previous errors
    setApiError(null)

    // Add user message with timestamp
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Create a menu summary with only food names (no nutrition info)
      const menuSummary = createMenuSummary()

      // Prepare the conversation history (excluding any system messages)
      const conversationHistory = messages
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

      // Add current user message
      const apiMessages = [
        ...conversationHistory,
        {
          role: "user",
          content: input,
        },
      ]

      console.log(
        `Sending request to AI API with ${apiMessages.length} messages and menu summary (${menuSummary.length} chars)`,
      )

      // Create a temporary message for streaming
      const tempMessageId = Date.now() + 1000
      setMessages((prev) => [
        ...prev,
        {
          id: tempMessageId.toString(),
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        },
      ])

      // Call the AI API with the user's message and menu data
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          menuSummary,
        }),
      })

      console.log(`Received response from AI API: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      if (!response.body) {
        throw new Error("Response body is null")
      }

      // Process the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ""

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            console.log("Stream complete, final content length:", accumulatedContent.length)
            break
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true })
          console.log("Received chunk:", chunk.length > 100 ? chunk.substring(0, 100) + "..." : chunk)

          // Process each line in the chunk
          const lines = chunk.split("\n").filter((line) => line.trim() !== "")

          for (const line of lines) {
            try {
              // Try to parse the line as JSON
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6) // Remove 'data: ' prefix

                try {
                  const parsedData = JSON.parse(jsonStr)
                  console.log("Parsed data:", parsedData)

                  // Extract content from the parsed data
                  if (parsedData.text) {
                    accumulatedContent += parsedData.text
                    console.log("Updated content length:", accumulatedContent.length)

                    // Enrich the response with nutrition info
                    const enrichedContent = await enrichResponseWithNutrition(accumulatedContent)

                    // Format the content
                    const formattedContent = formatAIResponse(enrichedContent)

                    // Update the message with accumulated content and formatted content
                    setMessages((prevMessages) =>
                      prevMessages.map((msg) =>
                        msg.id === tempMessageId.toString()
                          ? {
                              ...msg,
                              content: enrichedContent,
                              formattedContent: renderFormattedContent(formattedContent),
                            }
                          : msg,
                      ),
                    )
                    autoSaveSession(messages)
                  }
                } catch (jsonError) {
                  console.warn("Failed to parse JSON:", jsonStr, jsonError)
                }
              }
            } catch (lineError) {
              console.warn("Error processing line:", line, lineError)
            }
          }
        }
      } catch (error) {
        console.error("Error processing stream:", error)

        // If we encounter an error during streaming, make sure we still have a message
        if (!accumulatedContent.trim()) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempMessageId.toString()
                ? {
                    ...msg,
                    content: "I'm sorry, I encountered an error while processing your request. Please try again.",
                    timestamp: Date.now(),
                  }
                : msg,
            ),
          )
        }
      }

      // If we somehow ended up with empty content, provide a fallback message
      if (!accumulatedContent.trim()) {
        console.error("No content generated, using fallback message")

        // Try a direct API call as a fallback
        try {
          const directResponse = await fetch("/api/chat/direct", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: input,
              menuSummary,
            }),
          })

          if (directResponse.ok) {
            const data = await directResponse.json()
            if (data.text) {
              // Enrich the response with nutrition info
              const enrichedContent = await enrichResponseWithNutrition(data.text)

              // Format the content
              const formattedContent = formatAIResponse(enrichedContent)

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tempMessageId.toString()
                    ? {
                        ...msg,
                        content: enrichedContent,
                        formattedContent: renderFormattedContent(formattedContent),
                        timestamp: Date.now(),
                      }
                    : msg,
                ),
              )

              return
            }
          }
        } catch (directError) {
          console.error("Direct API fallback failed:", directError)
        }

        // If all else fails, use a static fallback message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempMessageId.toString()
              ? {
                  ...msg,
                  content:
                    "I'm sorry, I couldn't generate a response about the menu items. Please try asking a different question.",
                  timestamp: Date.now(),
                }
              : msg,
          ),
        )
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setApiError(error instanceof Error ? error.message : "Unknown error occurred")
      console.error(`AI API error details:`, error)

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I couldn't process your request. Please try asking a simpler question or try again later.",
        role: "assistant",
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {apiError}. Try asking a simpler question or selecting a different dining hall.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Dining Hall</label>
            <Select value={selectedDiningHall} onValueChange={(value: DiningHall) => setSelectedDiningHall(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a dining hall" />
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

          {selectedDiningHall && (
            <div>
              <label className="block text-sm font-medium mb-2">Select Meal Period</label>
              <Select value={selectedMealPeriod} onValueChange={setSelectedMealPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a meal period" />
                </SelectTrigger>
                <SelectContent>
                  {DINING_HALLS[selectedDiningHall as DiningHall].mealPeriods.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period.replace("+", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-end">
            <Button
              onClick={fetchMenuData}
              disabled={isMenuLoading || !selectedDiningHall || !selectedMealPeriod}
              className="w-full"
            >
              {isMenuLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Menu...
                </>
              ) : (
                "Load Menu"
              )}
            </Button>
          </div>
        </div>

        {isMenuLoading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{loadingStage}</span>
              <span className="text-sm font-medium">{loadingProgress}%</span>
            </div>
            <Progress value={loadingProgress} className="h-2 w-full" />
            <p className="text-xs text-muted-foreground text-center">
              {loadingProgress < 30 && "Connecting to dining services..."}
              {loadingProgress >= 30 && loadingProgress < 70 && "Menu data received, processing..."}
              {loadingProgress >= 70 && loadingProgress < 90 && "Organizing menu data..."}
              {loadingProgress >= 90 && "Almost done..."}
            </p>
          </div>
        )}

        {menuError && (
          <div className="text-destructive mt-4 p-4 border border-destructive rounded-md">Error: {menuError}</div>
        )}
      </div>

      <div className="flex flex-col h-[60vh]">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Chat</h2>
          <div className="flex gap-2">
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>Chat History</DialogTitle>
                  <DialogDescription>View and load your saved chat sessions.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[400px] overflow-y-auto">
                  {chatSessions.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No saved chat sessions yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {chatSessions
                        .sort((a, b) => b.lastUpdated - a.lastUpdated)
                        .map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50"
                          >
                            <div>
                              <h3 className="font-medium">{session.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {session.diningHall} ({session.mealPeriod.replace("+", " ")}) - {session.date}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(session.lastUpdated), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => loadChatSession(session.id)}>
                                Load
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => exportChat(session.id)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => deleteChatSession(session.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="flex-1 overflow-y-auto mb-4">
          <CardContent className="p-4 space-y-4">
            {messages
              .filter((msg) => msg.role !== "system")
              .map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {message.formattedContent || message.content}
                    {message.timestamp && (
                      <div className="text-xs opacity-50 mt-1 text-right">
                        {format(new Date(message.timestamp), "h:mm a")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              menuData
                ? "Ask about menu items or meal recommendations..."
                : "Select a dining hall and load menu to get started..."
            }
            className="flex-1"
            disabled={isLoading || !menuData}
          />
          <Button type="submit" disabled={isLoading || !input.trim() || !menuData}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}

