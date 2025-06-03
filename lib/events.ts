// Custom event system for cross-component communication
export const EVENTS = {
  MEAL_ADDED: "meal-added",
  MEAL_UPDATED: "meal-updated",
  MEAL_DELETED: "meal-deleted",
}

// Dispatch a custom event
export function dispatchCustomEvent(eventName: string, data?: any) {
  console.log(`Dispatching ${eventName} event with data:`, data)
  const event = new CustomEvent(eventName, { detail: data })
  window.dispatchEvent(event)
}

// Add a listener for a custom event
export function addCustomEventListener(eventName: string, callback: (data?: any) => void) {
  const handler = (e: CustomEvent) => {
    console.log(`Received ${eventName} event with data:`, e.detail)
    callback(e.detail)
  }
  window.addEventListener(eventName, handler as EventListener)
  return () => window.removeEventListener(eventName, handler as EventListener)
}

