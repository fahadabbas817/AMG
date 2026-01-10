import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generates page numbers for pagination with ellipsis
 * @param currentPage - Current page number (1-based)
 * @param totalPages - Total number of pages
 * @returns Array of page numbers and ellipsis strings
 */
export function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5 // Maximum number of page buttons to show
  const rangeWithDots = []

  if (totalPages <= maxVisiblePages) {
    // If total pages is 5 or less, show all pages
    for (let i = 1; i <= totalPages; i++) {
      rangeWithDots.push(i)
    }
  } else {
    // Always show first page
    rangeWithDots.push(1)

    if (currentPage <= 3) {
      // Near the beginning: [1] [2] [3] [4] ... [10]
      for (let i = 2; i <= 4; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      // Near the end: [1] ... [7] [8] [9] [10]
      rangeWithDots.push('...')
      for (let i = totalPages - 3; i <= totalPages; i++) {
        rangeWithDots.push(i)
      }
    } else {
      // In the middle: [1] ... [4] [5] [6] ... [10]
      rangeWithDots.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    }
  }

  return rangeWithDots
}

/**
 * Normalizes vendor/profile request data structure
 */
export function normalizeRequestData(data: any): Record<string, any> {
  if (!data) return {}

  // If wrapped in 'data' prop (common pattern)
  const content =
    data.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? data.data
      : data

  // Flatten bankDetails if present
  if (content.bankDetails && typeof content.bankDetails === 'object') {
    const { bankDetails, ...rest } = content
    return { ...rest, ...bankDetails }
  }

  return content
}

/**
 * Normalizes a value for comparison (treats null/undefined/empty string as same)
 */
export function normalizeValue(val: any): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

/**
 * Returns an object containing only the keys where values differ between the two objects.
 * Uses normalizeValue for comparison.
 */
export function getChangedFields(oldData: any, newData: any) {
  const normalizedOld = normalizeRequestData(oldData)
  const normalizedNew = normalizeRequestData(newData)

  // Only check keys that exist in the new data (partial update support)
  const changes: Record<string, { old: any; new: any }> = {}

  Object.keys(normalizedNew).forEach((key) => {
    const oldVal = normalizedOld[key]
    const newVal = normalizedNew[key]

    if (normalizeValue(oldVal) !== normalizeValue(newVal)) {
      changes[key] = { old: oldVal, new: newVal }
    }
  })

  return changes
}
