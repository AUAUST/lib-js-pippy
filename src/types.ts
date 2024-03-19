import type { Pipe } from "~/index";

type PipeInstance = InstanceType<typeof Pipe>;

/**
 * The arguments that can be passed to a pipeline entry.
 * It's either an array of arguments or a function that takes the previous value and returns an array of arguments.
 */
type PipelineArguments = any[] | [(value: any) => any[]];

/** A pipeline entry that is used to access a property on the previous value. */
type PropertyCoupling = {
  action: PropertyKey;
  args?: PipelineArguments;
};

/** A pipeline entry that is used to call a function with the previous value. */
type FunctionCoupling = {
  action: (...args: any[]) => any;
  args?: PipelineArguments;
};

/** A pipeline entry that provides a fallback value if the pipeline reaches an undefined value. */
type FallbackCoupling = {
  fallback: any;
};

/** A pipeline entry that is used to apply logic to the previous value. */
type LogicalCoupling = PropertyCoupling | FunctionCoupling;

/** Any pipeline entry. */
type Coupling = LogicalCoupling | FallbackCoupling;

/** A list of pipeline entries to be executed in order. */
type Pipeline = Coupling[];

export type {
  Coupling,
  FallbackCoupling,
  FunctionCoupling,
  LogicalCoupling,
  PipeInstance,
  Pipeline,
  PipelineArguments,
  PropertyCoupling,
};
