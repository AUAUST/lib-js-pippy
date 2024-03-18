import { expect, test } from "vitest";

import { Pipe } from "~/pipe";

test("test", () => {
  const pipe = new Pipe()
    .pipe("toUpperCase")
    .pipe("split", " ")
    .pipe("join", "-")
    .pipe("split", "")
    .pipe("join", "_");

  expect(pipe.run("hello world")).toBe("H_E_L_L_O_-_W_O_R_L_D");
});
