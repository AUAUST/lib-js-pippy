import { F, N, O, P, S } from "@auaust/primitive-kit";

const wrap = (function () {
  const handler: ProxyHandler<Pipe> = {
    get(target, prop, receiver) {
      if (Pipe.protectedProperties.includes(prop as ProtectedProperty))
        return Reflect.get(target, prop, receiver);

      return new Pipe(...target.pipeline, { action: prop });
    },
    apply(target, _, args) {
      const last = target.pipeline[target.pipeline.length - 1];
      if (last && "action" in last) last.args = args;
      return wrap(target);
    },
  };

  return function (pipe: Pipe) {
    return new Proxy(pipe, handler);
  };
})();

/**
 * The properties that can't be used via the proxy syntax as they're used to implement the piping mechanism.
 */
type ProtectedProperty = (typeof protectedProperties)[number];

/**
 * The arguments that can be passed to a pipeline entry.
 * It's either an array of arguments or a function that takes the previous value and returns an array of arguments.
 */
type PipelineEntryArguments = any[] | [(value: any) => any[]];

/** A pipeline entry that is used to access a property on the previous value. */
type PropertyPipelineEntry = {
  action: PropertyKey;
  args?: PipelineEntryArguments;
};
/** A pipeline entry that is used to call a function with the previous value. */
type FunctionPipelineEntry = {
  action: (...args: any[]) => any;
  args?: PipelineEntryArguments;
};
/** A pipeline entry that provides a fallback value if the pipeline reaches an undefined value. */
type FallbackPipelineEntry = {
  fallback: any;
};

/** A pipeline entry that is used to apply logic to the previous value. */
type LogicPipelineEntry = PropertyPipelineEntry | FunctionPipelineEntry;
/** Any pipeline entry. */
type PipelineEntry = LogicPipelineEntry | FallbackPipelineEntry;

/** A list of pipeline entries to be executed in order. */
type Pipeline = PipelineEntry[];

/**
 * Helper to access a property on the previous value safely.
 */
const getProperty = (value: any, property: PropertyKey) => {
  return value?.[property] ?? undefined;
};

/**
 * Helper to get the arguments to pass to a function.
 */
const getArguments = (args: PipelineEntryArguments): any[] => {
  const finalArgs = args.length === 1 && F.is(args[0]) ? args[0]() : args;
  return Array.isArray(finalArgs) ? finalArgs : [finalArgs];
};

const protectedProperties = [
  "fallback",
  "pipe",
  "pipeline",
  "protectedProperties",
  "run",
] as const;

class Pipe extends Function {
  /**
   * Properties that can't be used via the proxy syntax as they're used to implement the piping mechanism
   * @internal
   */
  static readonly protectedProperties = O.freeze(
    protectedProperties
  ) as readonly ProtectedProperty[];

  /** @internal */
  readonly pipeline: Pipeline;

  constructor(...pipeline: Pipeline) {
    super();
    this.pipeline = pipeline;
    return wrap(this);
  }

  /**
   * Registers a new step in the pipeline, either by specifying a property to access on the previous value
   * or a function to call with the previous value.
   *
   * If a property key is passed but when running the pipeline the value isn't a method, the argument are ignored.
   * If the value is a method, the arguments are passed to it.
   * If a function is passed, the first argument is the previous value and the rest are passed to the function.
   */
  pipe(
    action: LogicPipelineEntry["action"],
    ...args: PipelineEntryArguments
  ): Pipe {
    // FunctionPipelineEntry
    if (F.is(action)) {
      return new Pipe(...this.pipeline, { action, args });
    }

    // PropertyPipelineEntry
    if (N.is(action) || S.is(action) || typeof action === "symbol") {
      return new Pipe(...this.pipeline, { action, args });
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

      const { action, args = [] } = entry;

      if (F.is(action)) {
        try {
          output = action(output, ...getArguments(args));
        } catch {
          output = undefined;
        }

        continue;
      }

      // If arguments are provided it means it's aimed to be called
      if (args?.length) {
        const method = getProperty(output, action);

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
      const value = getProperty(output, action);

      try {
        output = F.is(value) ? value.call(output) : value;
      } catch {
        output = undefined;
      }
    }

    return output;
  }
}

const obj = {
  foo: (arg) => {
    return arg + arg;
  },
};

// const pipe = new Pipe().foo("baz").toUpperCase();
const pipe = new Pipe().valueOf().toString().slice(0, 3).fallback("foo");

console.log(pipe.run(obj));

// const pipe = new Pipe()
//   .pipe((prev) => prev + 1)
//   .toString.pipe((prev) => prev * 2)
//   .pipe("toExponential")
//   .fallback(3);

// // .pipe("toUpperCase")
// // .pipe("split", " ")
// // .pipe("join", "-")
// // .pipe("fooBar")
// // .pipe("join", ":")
// // .fallback(3)
// // .pipe(() => {
// //   throw new Error("error");
// // })
// // .fallback(4)
// // .pipe((prev) => prev * 3)
// // .pipe(
// //   (prev, n: number) => prev * n,
// //   () => 3
// // )
// // .pipe(
// //   (prev, ...args) => args.reduce((acc, curr) => acc + curr, prev),
// //   () => [2, 3, 4]
// // )
// // .pipe("toString");

// console.log(
//   // pipe.run(1),
//   // pipe.run(10),
//   // pipe.run(""),
//   pipe.run(undefined)

//   // pipe.run(3)
// );

export { Pipe };
