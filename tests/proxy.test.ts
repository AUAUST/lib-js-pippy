import { describe, expect, test } from "vitest";

import { Pipe } from "~/index";

describe("Proxied Pipes", () => {
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
    const pipeline = new Pipe().toUpperCase().split(" ").join("-");

    expect(pipeline).toBeDefined();
    expect(pipeline).toBeInstanceOf(Pipe);
    expect(pipeline.run("hello world")).toBe("HELLO-WORLD");
  });

  test("should register a property access regardless of it being called", () => {
    const pipeline1 = new Pipe().toUpperCase().toLowerCase().trim();
    const pipeline2 = new Pipe().toUpperCase.toLowerCase.trim;

    expect(pipeline1.run(" Hello World ")).toBe("hello world");
    expect(pipeline2.run(" Hello World ")).toBe(pipeline1.run(" Hello World "));
  });

  test("should be able to have a mix of default `pipe` and property access", () => {
    const pipeline = new Pipe().pipe("foo").fallback("fallback").toUpperCase();

    expect(pipeline.run(null)).toBe("FALLBACK");
    expect(pipeline.run("hello world")).toBe("FALLBACK");
  });
});
