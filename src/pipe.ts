import { F, N, P, S } from "@auaust/primitive-kit";

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

/**
 * The arguments that can be passed to a pipeline entry.
 * It's either an array of arguments or a function that takes the previous value and returns an array of arguments.
 */
type PipelineEntryArguments = any[] | [(value: any) => any[]];

type PropertyPipelineEntry = {
  key: PropertyKey;
  args?: PipelineEntryArguments;
};
type FunctionPipelineEntry = {
  key: (...args: any[]) => any;
  args?: PipelineEntryArguments;
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
const getProperty = (value: any, key: PropertyKey) => {
  return value?.[key] ?? undefined;
};

/**
 * Helper to get the arguments to pass to a function.
 */
const getArguments = (args: PipelineEntryArguments): any[] => {
  const finalArgs = args.length === 1 && F.is(args[0]) ? args[0]() : args;
  return Array.isArray(finalArgs) ? finalArgs : [finalArgs];
};

class Pipe {
  // Properties that can't be used via the proxy syntax as they're used to implement the piping mechanism
  static readonly protectedProperties: PropertyKey[] = [
    "run",
    "fallback",
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
  pipe(key: LogicPipelineEntry["key"], ...args: PipelineEntryArguments): Pipe {
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

  /**
   * Runs the pipeline using the provided input as the initial value.
   */
  run(input: any) {
    let output: any = input;

    for (const entry of this.pipeline) {
      // If the value is a fallback, we only apply it if the value is nullish but always continue to the next entry
      if ("fallback" in entry) {
        if (P.isNullish(output)) output = entry.fallback;
        continue;
      }

      if (P.isNullish(output)) continue;

      const { key, args = [] } = entry;

      if (F.is(key)) {
        try {
          output = key(output, ...getArguments(args));
        } catch {
          output = undefined;
        }

        continue;
      }

      // If arguments are provided it means it's aimed to be called
      if (args?.length) {
        const method = getProperty(output, key);

        // so we call it with the arguments if it's a function
        if (F.is(method)) {
          output = method.call(output, ...getArguments(args));
        }

        // but if it's not a function, we use the fallback as a function call was intended
        else output = undefined;

        continue;
      }

      // If no arguments are provided, it might be a simple property access or an argumentless method call
      // This means that if the value is a function we call it without arguments, otherwise we use as is
      // If either the value itself or its return value when it's a function is undefined, we use the fallback
      const value = getProperty(output, key);

      try {
        output = F.is(value) ? value.call(output) : value;
      } catch {
        output = undefined;
      }
    }

    return output;
  }
}

const pipe = new Pipe()
  .pipe((prev) => prev + 1)
  .pipe((prev) => prev * 2)
  .pipe("toExponential")
  .fallback(3);

// .pipe("toUpperCase")
// .pipe("split", " ")
// .pipe("join", "-")
// .pipe("fooBar")
// .pipe("join", ":")
// .fallback(3)
// .pipe(() => {
//   throw new Error("error");
// })
// .fallback(4)
// .pipe((prev) => prev * 3)
// .pipe(
//   (prev, n: number) => prev * n,
//   () => 3
// )
// .pipe(
//   (prev, ...args) => args.reduce((acc, curr) => acc + curr, prev),
//   () => [2, 3, 4]
// )
// .pipe("toString");

console.log(
  // pipe.run(1),
  // pipe.run(10),
  // pipe.run(""),
  pipe.run(undefined)

  // pipe.run(3)
);

export { Pipe };
