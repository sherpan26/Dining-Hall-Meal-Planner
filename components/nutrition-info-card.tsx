import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"

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

interface NutritionInfoCardProps {
  data: NutritionData | null
  isLoading: boolean
}

export default function NutritionInfoCard({ data, isLoading }: NutritionInfoCardProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return <div className="p-4 text-center text-muted-foreground">Nutrition information not available</div>
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-muted p-4 rounded-md">
        <div className="text-lg font-bold">Nutrition Facts</div>
        <div className="text-sm">Serving Size {data.servingSize}</div>
        <div className="text-lg font-bold mt-2">Calories {data.calories}</div>

        <Separator className="my-2" />

        <div className="grid grid-cols-2 gap-1 text-sm">
          <div className="font-medium">Total Fat {data.totalFat}</div>
          <div className="text-right">{data.percentDailyValues["Total Fat"] || ""}</div>

          <div className="pl-4">Saturated Fat {data.saturatedFat}</div>
          <div className="text-right">
            {data.percentDailyValues["Saturated Fat"] || data.percentDailyValues["Sat. Fat"] || ""}
          </div>

          <div className="pl-4">Trans Fat {data.transFat}</div>
          <div className="text-right"></div>

          <div className="font-medium">Cholesterol {data.cholesterol}</div>
          <div className="text-right">{data.percentDailyValues["Cholesterol"] || ""}</div>

          <div className="font-medium">Sodium {data.sodium}</div>
          <div className="text-right">{data.percentDailyValues["Sodium"] || ""}</div>

          <div className="font-medium">Total Carbohydrate {data.totalCarbs}</div>
          <div className="text-right">
            {data.percentDailyValues["Total Carbohydrate"] || data.percentDailyValues["Tot. Carb."] || ""}
          </div>

          <div className="pl-4">Dietary Fiber {data.dietaryFiber}</div>
          <div className="text-right">{data.percentDailyValues["Dietary Fiber"] || ""}</div>

          <div className="pl-4">Sugars {data.sugars}</div>
          <div className="text-right"></div>

          <div className="font-medium">Protein {data.protein}</div>
          <div className="text-right">{data.percentDailyValues["Protein"] || ""}</div>
        </div>
      </div>

      {data.ingredients && (
        <div>
          <h4 className="font-medium mb-1">Ingredients</h4>
          <p className="text-sm">{data.ingredients}</p>
        </div>
      )}

      {data.allergens && (
        <div>
          <h4 className="font-medium mb-1">Allergens</h4>
          <p className="text-sm">{data.allergens}</p>
        </div>
      )}

      {Object.keys(data.percentDailyValues).length > 0 && (
        <div className="text-xs text-muted-foreground">* Percent Daily Values are based on a 2,000 calorie diet.</div>
      )}
    </div>
  )
}

