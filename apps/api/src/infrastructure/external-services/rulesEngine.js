/**
 * Minimal rule engine with deterministic evaluation.
 * Kept in JS so existing .js imports continue to work in runtime.
 */

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeRules(rules) {
  return Array.isArray(rules) ? rules.filter(Boolean) : [];
}

function evaluateRule(rule, context) {
  if (!rule || typeof rule !== "object") return false;
  const { field, operator = "eq", value } = rule;
  if (typeof field !== "string" || !field) return false;

  const actual = context[field];
  switch (operator) {
    case "eq": return actual === value;
    case "neq": return actual !== value;
    case "gt": return isFiniteNumber(actual) && isFiniteNumber(value) && actual > value;
    case "gte": return isFiniteNumber(actual) && isFiniteNumber(value) && actual >= value;
    case "lt": return isFiniteNumber(actual) && isFiniteNumber(value) && actual < value;
    case "lte": return isFiniteNumber(actual) && isFiniteNumber(value) && actual <= value;
    case "in": return Array.isArray(value) && value.includes(actual);
    case "contains": return typeof actual === "string" && typeof value === "string" && actual.includes(value);
    default: return false;
  }
}

class RuleEngine {
  constructor() {
    this.rules = [];
  }

  setRules(rules) {
    this.rules = normalizeRules(rules);
  }

  addRule(rule) {
    if (rule && typeof rule === "object") this.rules.push(rule);
  }

  clear() {
    this.rules = [];
  }

  getMatchingRules(context, rules = this.rules) {
    return normalizeRules(rules).filter((rule) => evaluateRule(rule, context));
  }

  evaluate(context, rules = this.rules) {
    return this.getMatchingRules(context, rules);
  }
}

export const rulesEngine = new RuleEngine();
export function evaluateRules(context, rules) {
  return rulesEngine.evaluate(context, rules);
}
