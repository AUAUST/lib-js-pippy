import { F, N, S } from "@auaust/primitive-kit";

const handler: ProxyHandler<Pipe> = {
  get(target, prop, receiver) {
    return target[prop];

    if (Pipe.protectedProperties.includes(prop)) {
      return Reflect.get(target, prop, receiver);
    }

    target.pipeline.push({ key: prop });

    return wrapPipe(target);
  },
  apply(target, thisArg, args) {
    const lastEntry = target.pipeline[target.pipeline.length - 1]!;
    lastEntry.args = args;
    return wrapPipe(target);
  },
};
const wrapPipe = (pipe: Pipe) => new Proxy(pipe, handler);

type PropertyPipelineEntry = {
  key: PropertyKey;
  args?: any[];
};
type FunctionPipelineEntry = {
  key: (...args: any[]) => any;
  args?: any[];
};
type FallbackPipelineEntry = {
  fallback: any;
};
type LogicPipelineEntry = PropertyPipelineEntry | FunctionPipelineEntry;
type PipelineEntry = LogicPipelineEntry | FallbackPipelineEntry;

type Pipeline = PipelineEntry[];

/**
 * Helper to access a property on the previous value safely.
 */
const accessProperty = (value: any, key: PropertyKey) => {
  return value?.[key] ?? undefined;
};

/**
 * If the fallback is a function, call it with the last value and return the result.
 * Otherwise, return the fallback as is.
 */
const getFallback = (fallback: any, lastValue: any) => {
  return F.call(fallback, fallback, lastValue);
};

class Pipe {
  // Properties that can't be used via the proxy syntax as they're used to implement the piping mechanism
  static readonly protectedProperties: PropertyKey[] = [
    "run",
    "pipe",
    "pipeline",
    "protectedProperties",
  ];

  constructor(...pipeline: Pipeline) {
    this.pipeline = pipeline;
    return wrapPipe(this);
  }

  readonly pipeline: Pipeline;

  /**
   * Registers a new step in the pipeline, either by specifying a property to access on the previous value
   * or a function to call with the previous value.
   *
   * If a property key is passed but when running the pipeline the value isn't a method, the argument are ignored.
   * If the value is a method, the arguments are passed to it.
   * If a function is passed, the first argument is the previous value and the rest are passed to the function.
   */
  pipe(key: LogicPipelineEntry["key"], ...args: any[]): Pipe {
    // FunctionPipelineEntry
    if (F.is(key)) {
      return new Pipe(...this.pipeline, { key, args });
    }

    // PropertyPipelineEntry
    if (N.is(key) || S.is(key) || typeof key === "symbol") {
      return new Pipe(...this.pipeline, { key, args });
    }

    throw new Error(
      "Pipelines can only be built with functions or property accessors"
    );
  }

  /**
   * Registers a fallback step in the pipeline.
   * As soon as the pipeline reaches a value that's undefined, it fast-forwards to the next fallback in the pipeline.
   * If the fallback is reached but the value isn't undefined, the fallback is ignored.
   */
  fallback(fallback: any): Pipe {
    return new Pipe(...this.pipeline, { fallback });
  }

  run(input: any) {
    let output: any = input;

    for (const entry of this.pipeline) {
      if ("fallback" in entry) {
        if (output === undefined) {
          output = entry.fallback;
        }

        continue;
      }

      const { key, args = [] } = entry;

      if (F.is(key)) {
        output = key(output, ...args);
        continue;
      }

      // If arguments are provided it means it's aimed to be called
      if (args?.length) {
        const method = accessProperty(output, key);

        // so we call it with the arguments if it's a function
        if (F.is(method)) {
          output = method.call(output, ...args);
        }

        // but if it's not a function, we use the fallback as a function call was intended
        else output = undefined;
      }

      // If no arguments are provided, it might be a simple property access or an argumentless method call
      else {
        const value = accessProperty(output, key);

        // This means that if the value is a function we call it without arguments, otherwise we use as is
        // If either the value itself or its return value when it's a function is undefined, we use the fallback
        output = (F.is(value) ? value.call(output) : value) ?? undefined;
      }
    }

    return output;
  }
}

const pipe = new Pipe()
  .pipe("toUpperCase")
  .pipe("split", " ")
  .pipe("join", "-")
  .pipe("fooBar")
  .pipe("join", ":")
  .fallback(3)
  .pipe((prev) => prev * 3)
  .pipe((prev, n: number) => prev * n, 3);

console.log(
  pipe.run("hello world")
  // pipe.run(3)
);

export { Pipe };
