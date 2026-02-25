import type {
  BaseQueryClause,
  ObjectQueryClause,
  ComparableQueryClause,
  ArrayQueryClause,
} from "./queryClause.types";

export const baseResolutionFunctions: (keyof BaseQueryClause<unknown>)[] = [
  "is",
  "equals",
  "eq",
  "isNull",
  "isUndefined",
  "isNullish",
  "in",
  "satisfies",
];

export const resolutionFunctions: (
  | keyof BaseQueryClause<unknown>
  | keyof ObjectQueryClause<object>
  | keyof ComparableQueryClause<string | number>
  | keyof ArrayQueryClause<Array<unknown>>
)[] = [
  ...baseResolutionFunctions,
  "matches",
  "deepEquals",
  "includes",
  "gt",
  "greaterThan",
  "gte",
  "greaterThanOrEqualTo",
  "lt",
  "lessThan",
  "lte",
  "lessThanOrEqualTo",
];
