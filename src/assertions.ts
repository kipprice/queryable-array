import { isDefined } from "./typeChecks";

export function assert<T>(
  test: boolean,
  message: string = "expected value to be true",
): asserts test {
  if (!test) {
    throw new Error(message);
  }
}

export function assertIsDefined<T>(
  test: unknown,
  message: string = "expected value to be defined",
): asserts test is NonNullable<T> {
  if (!isDefined(test)) {
    throw new Error(message);
  }
}
