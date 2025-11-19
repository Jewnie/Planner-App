/**
 * Generates a simple hash from a string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Predefined Tailwind color palette
 * These are commonly used colors that work well for UI elements
 */
const TAILWIND_COLORS = [
  'blue',
  'green',
  'red',
  'yellow',
  'purple',
  'pink',
  'indigo',
  'teal',
  'orange',
  'cyan',
  'emerald',
  'violet',
  'fuchsia',
  'rose',
  'amber',
  'lime',
  'sky',
] as const;

/**
 * Color shade to use - always 100
 */
const COLOR_SHADE = 100;

/**
 * All possible background color classes (100 shade only) - ensures Tailwind includes them
 * This array helps Tailwind's JIT compiler recognize the classes
 * The void statement prevents the unused variable warning while keeping the classes visible to Tailwind
 */
const ALL_BG_COLORS = [
  'bg-blue-100',
  'bg-green-100',
  'bg-red-100',
  'bg-yellow-100',
  'bg-purple-100',
  'bg-pink-100',
  'bg-indigo-100',
  'bg-teal-100',
  'bg-orange-100',
  'bg-cyan-100',
  'bg-emerald-100',
  'bg-violet-100',
  'bg-fuchsia-100',
  'bg-rose-100',
  'bg-amber-100',
  'bg-lime-100',
  'bg-sky-100',
] as const;
void ALL_BG_COLORS; // Prevents unused variable warning while keeping classes visible to Tailwind

/**
 * Gets a deterministic Tailwind color class based on a string input.
 * The same string will always return the same color.
 * 
 * @param str - The string to generate a color for
 * @param variant - Optional variant: 'bg' for background, 'text' for text, 'border' for border (default: 'bg')
 * @returns A Tailwind color class string (e.g., 'bg-blue-500', 'text-green-300')
 * 
 * @example
 * getColorFromString('calendar-1') // returns 'bg-blue-500'
 * getColorFromString('calendar-1', 'text') // returns 'text-blue-500'
 * getColorFromString('event-123') // returns 'bg-green-300'
 */
export function getColorFromString(
  str: string,
  variant: 'bg' | 'text' | 'border' = 'bg'
): string {
  if (!str) {
    // Default color for empty strings
    return `${variant}-gray-200`;
  }

  const hash = hashString(str);
  
  // Select color from palette
  const colorIndex = hash % TAILWIND_COLORS.length;
  const color = TAILWIND_COLORS[colorIndex];
  
  // Always use shade 50
  return `${variant}-${color}-${COLOR_SHADE}`;
}

/**
 * Gets a deterministic Tailwind background color class based on a string input.
 * Convenience function that calls getColorFromString with 'bg' variant.
 * 
 * @param str - The string to generate a color for
 * @returns A Tailwind background color class string (e.g., 'bg-blue-500')
 */
export function getBackgroundColor(str: string): string {
  return getColorFromString(str, 'bg');
}

/**
 * Gets a deterministic Tailwind text color class based on a string input.
 * Convenience function that calls getColorFromString with 'text' variant.
 * 
 * @param str - The string to generate a color for
 * @returns A Tailwind text color class string (e.g., 'text-blue-500')
 */
export function getTextColor(str: string): string {
  return getColorFromString(str, 'text');
}

/**
 * Gets a deterministic Tailwind border color class based on a string input.
 * Convenience function that calls getColorFromString with 'border' variant.
 * 
 * @param str - The string to generate a color for
 * @returns A Tailwind border color class string (e.g., 'border-blue-500')
 */
export function getBorderColor(str: string): string {
  return getColorFromString(str, 'border');
}

