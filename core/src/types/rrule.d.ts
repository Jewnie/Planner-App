declare module "rrule" {
    export interface BetweenOptions {
      inc?: boolean;
    }
  
    export class RRule {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(options: any);
  
      all(limit?: number): Date[];
  
      between(
        after: Date,
        before: Date,
        opts?: BetweenOptions
      ): Date[];
    }
  
    export function rrulestr(
      rule: string,
      options?: { dtstart?: Date }
    ): RRule;
  }
  