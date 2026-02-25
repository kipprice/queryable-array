import { QueryArray } from "./queryArray";

export type Queryable<T> =
  T extends Array<infer OE>
    ? QueryArray<OE>
    : T extends object
      ? {
          [K in keyof T]: Queryable<T[K]>;
        }
      : T;

export type ElemType<T> = T extends Array<infer E> ? E : never;

export type NestedPartial<T> = {
  [K in keyof T]?: NestedPartial<T[K]>;
};

export type Key = string | number | symbol;

export enum SortOrder {
  A_BEFORE_B = -1,
  B_BEFORE_A = 1,
  EQUAL = 0,
}

// taken from the following stack overflow post:
// https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
