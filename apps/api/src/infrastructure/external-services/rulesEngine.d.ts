export interface EvaluationContext {
  temperature?: number;
  humidity?: number;
  location?: { latitude: number; longitude: number };
  status?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface Rule {
  field: string;
  operator?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
  value?: unknown;
  [key: string]: unknown;
}

export declare class RuleEngine {
  rules: Rule[];
  setRules(rules: Rule[]): void;
  addRule(rule: Rule): void;
  clear(): void;
  getMatchingRules(context: EvaluationContext, rules?: Rule[]): Rule[];
  evaluate(context: EvaluationContext, rules?: Rule[]): Rule[];
}

export declare const rulesEngine: RuleEngine;
export declare function evaluateRules(context: EvaluationContext, rules?: Rule[]): Rule[];
