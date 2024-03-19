import { describe, expect, test, vitest } from "vitest";

import { Pipe } from "~/index";

describe("Proxied Pipe", () => {
  test("should create pipes by accessing properties directly on the static `Pipe` class", () => {
    // @ts-expect-error
    const pipeline = Pipe.toUpperCase.split(" ").join("-");

    expect(pipeline).toBeDefined();
    expect(pipeline).toBeInstanceOf(Pipe);
    expect(pipeline.run("hello world")).toBe("HELLO-WORLD");
  });

  test("should return a new `Pipe` instance when calling without `new`", () => {
    // @ts-expect-error
    const pipeline = Pipe();

    expect(pipeline).toBeDefined();
    expect(pipeline).toBeInstanceOf(Pipe);
  });

  test("should not handle the protected properties as pipeline entries", () => {
    const pipeline = new Pipe();

    expect(Array.isArray(Pipe.protectedProperties)).toBe(true);

    // The protected properties should apply logic, thus not return a Pipe instance
    expect(
      Pipe.protectedProperties.some(
        (p) => pipeline[p as keyof typeof pipeline] instanceof Pipe
      )
    ).toBe(false);

    // All other properties should return a Pipe instance
    expect(
      ["foo", "bar", "baz"].some(
        (p) => !(pipeline[p as keyof typeof pipeline] instanceof Pipe)
      )
    ).toBe(false);
  });

  test("should handle property access as a pipe registration", () => {
    // @ts-expect-error
    const pipeline = new Pipe().toUpperCase().split(" ").join("-");

    expect(pipeline).toBeDefined();
    expect(pipeline).toBeInstanceOf(Pipe);
    expect(pipeline.run("hello world")).toBe("HELLO-WORLD");
  });

  test("should register a property access regardless of it being called", () => {
    // @ts-expect-error
    const pipeline1 = new Pipe().toUpperCase().toLowerCase().trim();
    // @ts-expect-error
    const pipeline2 = new Pipe().toUpperCase.toLowerCase.trim;

    expect(pipeline1.run(" Hello World ")).toBe("hello world");
    expect(pipeline2.run(" Hello World ")).toBe(pipeline1.run(" Hello World "));
  });

  test("should register the arguments passed to a call", () => {
    const fn = vitest.fn((...args: number[]) => {
      return `We have ${args.reduce((a, b) => a + b, 0)} apples`;
    });

    const object = { customMethod: fn };
    // @ts-expect-error
    const pipeline = new Pipe().customMethod(1, 2, 3);

    expect(pipeline.run(object)).toBe("We have 6 apples");
    expect(fn).toHaveBeenCalledWith(1, 2, 3);
  });

  test("should be able to have a mix of default `pipe` and property access", () => {
    // @ts-expect-error
    const pipeline = new Pipe().pipe("foo").fallback("fallback").toUpperCase();

    expect(pipeline.run(null)).toBe("FALLBACK");
    expect(pipeline.run("hello world")).toBe("FALLBACK");
  });
});
