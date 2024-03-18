import { F } from "@auaust/primitive-kit";

const handler: ProxyHandler<Pipe> = {
  get(target, prop, receiver) {
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

type PipelineEntry = {
  key: PropertyKey;
  fallback?: any;
  args?: any[];
};

type Pipeline = PipelineEntry[];

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
  readonly pipeline: Pipeline;

  constructor(...pipeline: Pipeline) {
    this.pipeline = pipeline;
    return wrapPipe(this);
  }

  static pipe(key: PropertyKey, ...args: [...any[], { fallback: any }]): Pipe {
    return new Pipe({ key: key, fallback: args.pop()?.fallback, args });
  }

  pipe(
    key: PropertyKey,
    ...args: [...arguments: any[], lastArgOrFallback: { fallback: any } | any]
  ): Pipe {
    if (
      args.length &&
      typeof args[args.length - 1] === "object" &&
      "fallback" in args[args.length - 1]
    ) {
      return new Pipe(...this.pipeline, {
        key,
        fallback: args.pop()?.fallback,
        args,
      });
    }

    return new Pipe(...this.pipeline, { key, fallback: undefined, args });
  }

  run(input: any) {
    let output: any = input;

    for (const { key, fallback, args } of this.pipeline) {
      // If arguments are provided it means it's aimed to be called
      if (args?.length) {
        const method = output[key];

        // so we call it with the arguments if it's a function
        if (F.is(method)) {
          output = method.call(output, ...args);
        }

        // but if it's not a function, we use the fallback as a function call was intended
        else {
          output = getFallback(fallback, output);
        }
      }

      // If no arguments are provided, it might be a simple property access or an argumentless method call
      else {
        const value = output[key];

        // This means that if the value is a function we call it without arguments, otherwise we use as is
        // If either the value itself or its return value when it's a function is undefined, we use the fallback
        output =
          (F.is(value) ? value.call(output) : value) ??
          getFallback(fallback, output);
      }
    }

    return output;
  }
}

const pipe = new Pipe()
  .pipe("toUpperCase")
  .pipe("split", " ")
  .pipe("join", "-");
// const pipe = Pipe.toUpperCase.split(" ").join("-");

console.log(
  pipe.run("hello world")
  // pipe.run(3)
);

export { Pipe };
