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
});
