import { describe, expect, test } from "vitest";

import { Pipe } from "~/index";

describe("Wrong usage of Pipe", () => {
  test("should throw when trying to build a pipeline with invalid properties", () => {
    // @ts-expect-error
    expect(() => new Pipe().pipe()).toThrow();
    // @ts-expect-error
    expect(() => new Pipe().pipe({})).toThrow();
    // @ts-expect-error
    expect(() => new Pipe().pipe(null)).toThrow();
    // @ts-expect-error
    expect(() => new Pipe().pipe(undefined)).toThrow();
  });

  test("should return undefined when passing arguments to a property that's not a function", () => {
    const object1 = { foo: "bar" };
    const object2 = { foo: (...args: any[]) => args.join(" ") };

    const pipeline = new Pipe().pipe("foo", "hello", "world");

    expect(pipeline.run(object1)).toBe(undefined); // foo exists, but the presence of arguments means it was expected to be callable
    expect(pipeline.run(object2)).toBe("hello world");
  });
});
