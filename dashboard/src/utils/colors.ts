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
  // Checked state variants for checkboxes
  'data-[state=checked]:bg-blue-100',
  'data-[state=checked]:bg-green-100',
  'data-[state=checked]:bg-red-100',
  'data-[state=checked]:bg-yellow-100',
  'data-[state=checked]:bg-purple-100',
  'data-[state=checked]:bg-pink-100',
  'data-[state=checked]:bg-indigo-100',
  'data-[state=checked]:bg-teal-100',
  'data-[state=checked]:bg-orange-100',
  'data-[state=checked]:bg-cyan-100',
  'data-[state=checked]:bg-emerald-100',
  'data-[state=checked]:bg-violet-100',
  'data-[state=checked]:bg-fuchsia-100',
  'data-[state=checked]:bg-rose-100',
  'data-[state=checked]:bg-amber-100',
  'data-[state=checked]:bg-lime-100',
  'data-[state=checked]:bg-sky-100',
] as const;
void ALL_BG_COLORS; // Prevents unused variable warning while keeping classes visible to Tailwind

/**
 * Gets a deterministic Tailwind color class based on a string input.
 * The same string will always return the same color.
 * 
 * @param str - The string to generate a color for
 * @param variant - Optional variant: 'bg' for background, 'text' for text, 'border' for border (default: 'bg')
 * @returns A Tailwind color class string (e.g., 'bg-blue-100', 'text-green-100')
 * 
 * @example
 * getDeterministicColor('calendar-1') // returns 'bg-blue-100'
 * getDeterministicColor('calendar-1', 'text') // returns 'text-blue-100'
 * getDeterministicColor('event-123', 'border') // returns 'border-green-100'
 */
export function getDeterministicColor(
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
  
  // Always use shade 100
  return `${variant}-${color}-${COLOR_SHADE}`;
}

