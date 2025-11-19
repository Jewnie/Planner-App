import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// Map of color classes to their checked state variants
const CHECKED_COLOR_MAP: Record<string, { bg: string; border: string }> = {
  'bg-blue-100': {
    bg: 'data-[state=checked]:bg-blue-100',
    border: 'data-[state=checked]:border-blue-500',
  },
  'bg-green-100': {
    bg: 'data-[state=checked]:bg-green-100',
    border: 'data-[state=checked]:border-green-500',
  },
  'bg-red-100': {
    bg: 'data-[state=checked]:bg-red-100',
    border: 'data-[state=checked]:border-red-500',
  },
  'bg-yellow-100': {
    bg: 'data-[state=checked]:bg-yellow-100',
    border: 'data-[state=checked]:border-yellow-500',
  },
  'bg-purple-100': {
    bg: 'data-[state=checked]:bg-purple-100',
    border: 'data-[state=checked]:border-purple-500',
  },
  'bg-pink-100': {
    bg: 'data-[state=checked]:bg-pink-100',
    border: 'data-[state=checked]:border-pink-500',
  },
  'bg-indigo-100': {
    bg: 'data-[state=checked]:bg-indigo-100',
    border: 'data-[state=checked]:border-indigo-500',
  },
  'bg-teal-100': {
    bg: 'data-[state=checked]:bg-teal-100',
    border: 'data-[state=checked]:border-teal-500',
  },
  'bg-orange-100': {
    bg: 'data-[state=checked]:bg-orange-100',
    border: 'data-[state=checked]:border-orange-500',
  },
  'bg-cyan-100': {
    bg: 'data-[state=checked]:bg-cyan-100',
    border: 'data-[state=checked]:border-cyan-500',
  },
  'bg-emerald-100': {
    bg: 'data-[state=checked]:bg-emerald-100',
    border: 'data-[state=checked]:border-emerald-500',
  },
  'bg-violet-100': {
    bg: 'data-[state=checked]:bg-violet-100',
    border: 'data-[state=checked]:border-violet-500',
  },
  'bg-fuchsia-100': {
    bg: 'data-[state=checked]:bg-fuchsia-100',
    border: 'data-[state=checked]:border-fuchsia-500',
  },
  'bg-rose-100': {
    bg: 'data-[state=checked]:bg-rose-100',
    border: 'data-[state=checked]:border-rose-500',
  },
  'bg-amber-100': {
    bg: 'data-[state=checked]:bg-amber-100',
    border: 'data-[state=checked]:border-amber-500',
  },
  'bg-lime-100': {
    bg: 'data-[state=checked]:bg-lime-100',
    border: 'data-[state=checked]:border-lime-500',
  },
  'bg-sky-100': {
    bg: 'data-[state=checked]:bg-sky-100',
    border: 'data-[state=checked]:border-sky-500',
  },
};

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  // Extract background color class from className if present (e.g., "bg-blue-100")
  const bgColorMatch = className?.match(/bg-(\w+-\d+)/);
  const bgColorClass = bgColorMatch ? bgColorMatch[0] : null;
  const checkedColors = bgColorClass ? CHECKED_COLOR_MAP[bgColorClass] : null;

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        // Apply default checked styles if no custom color
        !checkedColors &&
          'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary',
        // Apply custom checked state classes
        checkedColors?.bg,
        checkedColors?.border,
        // Apply other className styles (excluding the bg color which we handle above)
        className?.replace(/bg-\w+-\d+/g, '').trim(),
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
