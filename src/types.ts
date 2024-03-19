import { Pipe } from "~/index";

type PipeInstance = InstanceType<typeof Pipe>;

/**
 * The arguments that can be passed to a pipeline entry.
 * It's either an array of arguments or a function that takes the previous value and returns an array of arguments.
 */
type PipelineArguments = any[] | [(value: any) => any[]];

/** A pipeline entry that is used to access a property on the previous value. */
type PropertyPipelineEntry = {
  action: PropertyKey;
  args?: PipelineArguments;
};

/** A pipeline entry that is used to call a function with the previous value. */
type FunctionPipelineEntry = {
  action: (...args: any[]) => any;
  args?: PipelineArguments;
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

export {
  FallbackPipelineEntry,
  FunctionPipelineEntry,
  LogicPipelineEntry,
  PipeInstance,
  Pipeline,
  PipelineArguments,
  PipelineEntry,
  PropertyPipelineEntry,
};
