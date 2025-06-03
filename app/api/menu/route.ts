import { NextResponse } from "next/server"

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
}

function constructUrl(diningHall: string, date: string, mealPeriod: string): string {
  const hallConfig = DINING_HALLS[diningHall as keyof typeof DINING_HALLS]
  return `${hallConfig.baseUrl}?locationNum=${hallConfig.locationNum}&locationName=${hallConfig.locationName}&dtdate=${date}&activeMeal=${mealPeriod}&sName=Rutgers+University+Dining`
}

function extractMenuItems(html: string, diningHall: string, date: string) {
  const menuItems = []
  let currentCategory = "Uncategorized"

  // Find all h3 elements (categories) and fieldsets (menu items)
  const categoryRegex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi
  const fieldsetRegex = /<fieldset[^>]*>([\s\S]*?)<\/fieldset>/gi

  // First, find all categories
  let categoryMatch
  const categories = []
  while ((categoryMatch = categoryRegex.exec(html)) !== null) {
    const categoryText = categoryMatch[1].replace(/<[^>]*>/g, "").trim()
    if (categoryText) {
      categories.push({
        text: categoryText.replace(/^--\s*|\s*--$/g, ""),
        position: categoryMatch.index,
      })
    }
  }

  // Then find all menu items
  let fieldsetMatch
  while ((fieldsetMatch = fieldsetRegex.exec(html)) !== null) {
    const fieldsetContent = fieldsetMatch[0]
    const fieldsetPosition = fieldsetMatch.index

    // Find the most recent category
    for (let i = categories.length - 1; i >= 0; i--) {
      if (categories[i].position < fieldsetPosition) {
        currentCategory = categories[i].text
        break
      }
    }

    // Extract item details
    const nameMatch = fieldsetContent.match(/<div class="col-1[^>]*>[\s\S]*?<label[^>]*>([\s\S]*?)<\/label>/i)
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].replace(/<[^>]*>/g, "").trim()

      // Extract portion size
      const portionMatch = fieldsetContent.match(/<div class="col-2[^>]*>[\s\S]*?<label[^>]*>([\s\S]*?)<\/label>/i)
      const portion = portionMatch ? portionMatch[1].replace(/<[^>]*>/g, "").trim() : ""

      // Extract nutrition link - look for the exact pattern in the HTML example
      const nutritionMatch = fieldsetContent.match(
        /<div class="col-3"[^>]*>[\s\S]*?<a href=['"](label\.aspx[^'"]*)['"]/i,
      )
      let nutritionLink = null

      if (nutritionMatch && nutritionMatch[1]) {
        // Construct the full URL for the nutrition link
        nutritionLink = `https://menuportal23.dining.rutgers.edu/foodpronet/${nutritionMatch[1]}`
      }

      menuItems.push({
        name,
        category: currentCategory,
        portion,
        nutritionLink,
      })
    }
  }

  return menuItems
}

export async function POST(req: Request) {
  try {
    const { diningHall, date, mealPeriod } = await req.json()

    const url = constructUrl(diningHall, date, mealPeriod)
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const html = await response.text()
    const menuItems = extractMenuItems(html, diningHall, date)

    // Group menu items by category
    const menuByCategory = menuItems.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = []
        }
        acc[item.category].push(item)
        return acc
      },
      {} as Record<string, typeof menuItems>,
    )

    return NextResponse.json({
      diningHall,
      date,
      mealPeriod,
      menuItems,
      menuByCategory,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in menu API:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "An error occurred" }, { status: 500 })
  }
}

