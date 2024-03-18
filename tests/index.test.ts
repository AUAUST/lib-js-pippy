import { describe, expect, test } from "vitest";

import { Pippy } from "~/index";

describe("Pippy", () => {
  test("should say hello", () => {
    expect(Pippy()).toBe("Greetings from Pippy!");
  });
});
