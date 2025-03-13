import { DefaultReporter } from "@amarislabs/logger";
import { type ConsolaInstance, createConsola } from "consola";

export const logger: ConsolaInstance = createConsola().setReporters([new DefaultReporter()]);
