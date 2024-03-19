/**
 * The arguments that can be passed to a pipeline entry.
 * It's either an array of arguments or a function that takes the previous value and returns an array of arguments.
 */
type PipelineArguments = any[] | [(value: any) => any[]];

/** A coupling that is used to access a property on the previous value. */
type PropertyCoupling<
  Value extends unknown = any,
  Property extends keyof Value = keyof Value
> = {
  action: Property;
  args?: PropertyCouplingArguments<Value, Property>;
};

type ArgumentsOrCallback<Arguments extends any[] = unknown[]> =
  Arguments["length"] extends 1
    ? Arguments | [() => Arguments] | [() => Arguments[0]]
    : Arguments | [() => Arguments];

type PropertyCouplingArguments<
  Value extends unknown,
  Property extends unknown
> = Property extends keyof Value
  ? Value[Property] extends (...args: infer Arguments) => any
    ? ArgumentsOrCallback<Arguments>
    : ArgumentsOrCallback
  : ArgumentsOrCallback;

/** A coupling that is used to call a function with the previous value. */
type FunctionCoupling<
  Value extends unknown = any,
  Fn = (prev: Value, ...args: any[]) => any
> = {
  action: Fn;
  args?: PropertyCouplingArguments<Value, Fn>;
};

/** A coupling that provides a fallback value if the pipeline reaches an undefined value. */
type FallbackCoupling = {
  fallback: any;
};

/** A coupling that is used to apply logic to the previous value. */
type LogicalCoupling = PropertyCoupling | FunctionCoupling;

/** Any coupling. */
type Coupling = LogicalCoupling | FallbackCoupling;

/** A list of couplings to be executed in order. */
type Pipeline = Coupling[];

export type {
  Coupling,
  FallbackCoupling,
  FunctionCoupling,
  LogicalCoupling,
  Pipeline,
  PipelineArguments,
  PropertyCoupling,
  PropertyCouplingArguments,
};
