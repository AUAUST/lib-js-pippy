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

  test("should expect callbacks to return an array of arguments but handle a single value", () => {
    const pipeline1 = new Pipe().pipe(
      (...args: string[]) => args.join(" "),
      () => ["hello", "world"]
    );
    const pipeline2 = new Pipe().pipe(
      (...args: string[]) => args.join(" "),
      () => ["hello"]
    );
    const pipeline3 = new Pipe().pipe(
      (...args: string[]) => args.join(" "),
      () => "hello"
    );

    expect(pipeline1.run("cool")).toBe("cool hello world");
    expect(pipeline2.run("cool")).toBe("cool hello"); // Array returned used as is
    expect(pipeline3.run("cool")).toBe("cool hello"); // String returned, converted to single entry array
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
    // @ts-expect-error
    const pipeline = new Pipe().toUpperCase().split(" ").join("-").toFunction();

    expect(pipeline).toBeDefined();
    expect(typeof pipeline).toBe("function");
    expect(pipeline("hello world")).toBe("HELLO-WORLD");
  });

  test("should be able to pipe another pipeline", () => {
    // @ts-expect-error // Will be fixed by the implementation of the types
    const pipeline1 = new Pipe().toUpperCase().replace("+", "");
    // @ts-expect-error
    const pipeline2 = new Pipe().trim();
    const pipeline3 = new Pipe()
      // @ts-expect-error
      .toExponential()
      // @ts-expect-error
      .pipe((v) => " " + v + " ")
      .pipe(pipeline1)
      .pipe(pipeline2);

    expect(pipeline3.run(123)).toBe("1.23E2");
  });

  describe("error handling", () => {
    test("shouldn't error when accessing invalid properties, even nested", () => {
      const pipeline = new Pipe()
        .pipe("meep")
        .pipe("foo", " ")
        .pipe("bomp", () => ["hello", "world"]);

      expect(pipeline.run(null)).toBe(null);
    });

    test("should catch errors thrown in piped functions", () => {
      const pipeline = new Pipe().pipe(() => {
        throw new Error("Some error");
      });

      expect(() => pipeline.run("hello world")).not.toThrow();
      expect(pipeline.run("hello world")).toBe(undefined);

      const pipeline2 = pipeline.fallback("fallback");

      expect(pipeline2.run("hello world")).toBe("fallback");
    });

    test("should catch errors thrown in method calls", () => {
      let count = 0;
      const object = {
        method() {
          if (count++ === 0) {
            return "Always cool the first time";
          }

          throw new Error();
        },
      };

      // @ts-expect-error
      const pipeline = new Pipe().method();

      expect(pipeline.run(object)).toBe("Always cool the first time"); // first call is fine
      expect(() => pipeline.run(object)).not.toThrow(); // then it throws
      expect(pipeline.run(object)).toBe(undefined); // but is still caught
    });
  });

  describe("`call` method", () => {
    const pipeline = new Pipe().call("hello", "world");
    const fn = vitest.fn((...args: string[]) => args.join(" "));

    test("should call a function if the previous value with arguments is a function", () => {
      expect(pipeline.run(fn)).toBe("hello world");
      expect(fn).toHaveBeenLastCalledWith("hello", "world");
    });

    test("should support passing arguments as a callback", () => {
      const pipeline = new Pipe().call(() => ["foo", "bar"]);

      expect(pipeline.run(fn)).toBe("foo bar");
      expect(fn).toHaveBeenLastCalledWith("foo", "bar");
    });

    test("should return the previous value if it's not a function", () => {
      expect(pipeline.run("hello world")).toBe("hello world");
      expect(pipeline.run(1)).toBe(1);
    });
  });
});
