import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface NutritionInfoProps {
  isOpen: boolean
  onClose: () => void
  nutritionLink: string | null
  itemName: string
  isLoading: boolean
}

export default function NutritionInfoDialog({
  isOpen,
  onClose,
  nutritionLink,
  itemName,
  isLoading,
}: NutritionInfoProps) {
  if (!nutritionLink) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{itemName}</DialogTitle>
          <DialogDescription>Nutrition Information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <iframe
              src={nutritionLink}
              className="w-full min-h-[500px] border-0"
              title={`Nutrition information for ${itemName}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

