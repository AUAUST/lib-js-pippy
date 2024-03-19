import { F, N, O, P, S } from "@auaust/primitive-kit";
import type {
  FunctionCoupling,
  Pipeline,
  PipelineArguments,
  PropertyCouplingArguments,
} from "~/types";

/** The properties that can't be used via the proxy syntax as they're used to implement the piping mechanism. */
type ProtectedProperty = (typeof protectedProperties)[number];

const protectedProperties = [
  "call",
  "fallback",
  "pipe",
  "pipeline",
  "protectedProperties",
  "run",
  "toFunction",
] as const;

const wrap = (function () {
  const handler: ProxyHandler<Pipe> = {
    get(target, prop, receiver) {
      if (Pipe.protectedProperties.includes(prop as ProtectedProperty)) {
        return Reflect.get(target, prop, receiver);
      }

      return new Pipe(...target.pipeline, { action: prop });
    },

    apply(target, _, args) {
      const pipeline = target.pipeline;
      const last = pipeline && pipeline[pipeline.length - 1];

      last && "action" in last && (last.args = args);

      return wrap(target);
    },
  };

  return function <T extends Pipe>(pipe: T): T {
    return new Proxy(pipe, handler) as T;
  };
})();

/** Helper to access a property on the previous value safely. */
const getProperty = (value: any, property: PropertyKey) => {
  return value?.[property] ?? undefined;
};

/** Helper to get the arguments to pass to a function. */
const getArguments = (value: any, args: PipelineArguments): any[] => {
  const finalArgs = args.length === 1 && F.is(args[0]) ? args[0](value) : args;
  return Array.isArray(finalArgs) ? finalArgs : [finalArgs];
};

// const Pipe = (function () {
class Pipe<I = unknown, O = I> extends Function {
  /**
   * Properties that can't be used via the proxy syntax as they're used to implement the piping mechanism.
   * @internal
   */
  static readonly protectedProperties = O.freeze(
    protectedProperties
  ) as readonly ProtectedProperty[];

  constructor(...pipeline: Pipeline) {
    return super(), (this.pipeline = pipeline), wrap(this as any);
  }

  /** @internal */
  readonly pipeline: Pipeline;

  /**
   * Registers a new step in the pipeline, either by specifying a property to access on the previous value
   * or a function to call with the previous value.
   *
   * If a property key is passed but when running the pipeline the value isn't a method, the argument are ignored.
   * If the value is a method, the arguments are passed to it.
   * If a function is passed, the first argument is the previous value and the rest are passed to the function.
   */

  // Pipe a property access
  pipe<T extends keyof O>(
    action: T,
    ...args: NonNullable<PropertyCouplingArguments<O, T>>
  ): Pipe<I, O[T] extends (...args: any[]) => infer R ? R : O[T]>;

  // Pipe a function
  pipe<T extends FunctionCoupling<O>, Fn extends T["action"]>(
    action: Fn,
    ...args: NonNullable<T["args"]>
  ): Pipe<I, ReturnType<T["action"]>>;

  pipe(
    action: Pipe | PropertyKey | ((value: any) => any),
    ...args: PipelineArguments
  ): Pipe<any, any> {
    // FunctionPipelineEntry
    if (F.is(action)) {
      if (action instanceof Pipe) {
        return new Pipe(...this.pipeline, {
          action: action.toFunction(),
        });
      }

      return new Pipe(...this.pipeline, { action: action, args });
    }

    // PropertyPipelineEntry
    if (N.is(action) || S.is(action) || typeof action === "symbol") {
      return new Pipe(...this.pipeline, { action: action, args });
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
   * If the previous value is a function, it's called with the provided arguments.
   * Otherwise, the previous value is returned.
   *
   * This makes it possible to have the pipeline call a function if the chain reaches one.
   *
   * @example ```ts
   * const pipeline = new Pipe()
   *   .pipe("toFunction") // We assume this method returns a function on the previous value
   *   .call("hello", "world");
   *
   * pipeline.run(someObject) === someObject.toFunction()("hello", "world");
   * ```
   */
  call(...args: any[]): Pipe<I, O> {
    return new Pipe(...this.pipeline, {
      action: (value: any) =>
        F.is(value) ? value(...getArguments(value, args)) : value,
      args,
    });
  }

  /**
   * Returns the pipeline as a callable function, taking the initial value to run the pipeline with as a single argument.
   */
  toFunction(): (input: I) => O {
    return (input: I) => this.run(input);
  }

  /**
   * Runs the pipeline using the provided input as the initial value.
   */
  run(input: I): O {
    let output: any = input;

    for (const entry of this.pipeline) {
      if ("fallback" in entry) {
        if (P.isNullish(output)) output = entry.fallback;
        continue;
      }

      if (P.isNullish(output)) continue;

      const { action, args = [] } = entry;

      if (F.is(action)) {
        try {
          output = action(output, ...getArguments(output, args));
        } catch {
          output = undefined;
        }

        continue;
      }

      if (args?.length) {
        const method = getProperty(output, action);

        if (F.is(method))
          output = method.call(output, ...getArguments(output, args));
        else output = undefined;

        continue;
      }

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

const WrappedPipe = new Proxy(Pipe, {
  get(target, prop, receiver) {
    if (prop in target) return Reflect.get(target, prop, receiver);
    return new target({ action: prop });
  },

  apply(target, _, args) {
    return new target(...args);
  },
});

export { WrappedPipe as Pipe };
export type { ProtectedProperty };
