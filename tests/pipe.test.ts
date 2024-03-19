import { describe, expect, test, vitest } from "vitest";

import { Pipe } from "~/index";

describe("Pipe", () => {
  test("should be able to build a pipeline", () => {
    const pipeline = new Pipe()
      .pipe("toUpperCase")
      .pipe("split", " ")
      .pipe("join", "-");

    expect(pipeline).toBeDefined();
    expect(pipeline).toBeInstanceOf(Pipe);
    expect(pipeline.run("hello world")).toBe("HELLO-WORLD");
  });

  test("should be able to handle fallbacks", () => {
    const pipeline = new Pipe()
      .pipe("toUpperCase")
      .pipe("split", " ")
      .pipe("join", "-")
      .fallback("fallback")
      .pipe("toUpperCase");

    expect(pipeline.run(null)).toBe("FALLBACK");
  });

  test("shouldn't error when accessing invalid properties, even nested", () => {
    const pipeline = new Pipe()
      .pipe("meep")
      .pipe("foo", " ")
      .pipe("bomp", () => ["hello", "world"]);

    expect(pipeline.run(null)).toBe(null);
  });

  test("should handle functions in the pipeline", () => {
    const pipeline = new Pipe()
      .pipe((value: string) => value.toUpperCase())
      .pipe((value: string) => value.split(" "))
      .pipe((value: string[]) => value.join("-"));

    expect(pipeline.run("hello world")).toBe("HELLO-WORLD");
  });

  test("should pass arguments to functions in the pipeline", () => {
    const pipeline = new Pipe().pipe(
      (value: string, separator: string, before: string, after: string) => {
        return before + " " + value.split(separator).join("-") + " " + after;
      },
      " ",
      "before",
      "after"
    );

    expect(pipeline.run("hello world")).toBe("before hello-world after");
  });

  test("should handle arguments passed as a callback", () => {
    const fn = vitest.fn((previous: number, ...values: number[]) => {
      return values.reduce((a, b) => a + b, previous);
    });

    const pipeline = new Pipe().pipe(fn, () => {
      return [1, 2, 3];
    });

    expect(pipeline.run(4)).toBe(10);
    expect(fn).toHaveBeenCalledWith(
      // Previous value
      4,
      // Arguments returned from the callback
      1,
      2,
      3
    );
  });

  test("should be extendable", () => {
    const pipeline1 = new Pipe().pipe("toLowerCase").pipe("trim");

    expect(pipeline1.run(" Hello World ")).toBe("hello world");

    const pipeline2 = pipeline1.pipe("slice", 1, 5);

    expect(pipeline1.run(" Hello World ")).toBe("hello world");
    expect(pipeline2.run(" Hello World ")).toBe("ello");

    const pipeline3 = pipeline2.pipe((value) => value + value);

    expect(pipeline1.run(" Hello World ")).toBe("hello world");
    expect(pipeline2.run(" Hello World ")).toBe("ello");
    expect(pipeline3.run(" Hello World ")).toBe("elloello");
  });

  test("can be converted to a function", () => {
    const pipeline = new Pipe().toUpperCase().split(" ").join("-").toFunction();

    expect(pipeline).toBeDefined();
    expect(typeof pipeline).toBe("function");
    expect(pipeline("hello world")).toBe("HELLO-WORLD");
  });
});
