import { describe, expect, test } from "vitest";

import { Pipe } from "~/index";

describe("Wrong usage of Pipe", () => {
  test("should throw when trying to build a pipeline with invalid properties", () => {
    expect(() => new Pipe().pipe()).toThrow();
    expect(() => new Pipe().pipe({})).toThrow();
    expect(() => new Pipe().pipe(null)).toThrow();
    expect(() => new Pipe().pipe(undefined)).toThrow();
  });
});
