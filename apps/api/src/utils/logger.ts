import { DefaultReporter } from "@amarislabs/logger";
import { env } from "@virtualqueue/environment";
import { type ConsolaInstance, LogLevels, createConsola } from "consola";

let logLevel: number =
    env.NODE_ENV === "test" ? LogLevels.silent : env.NODE_ENV === "production" ? LogLevels.info : LogLevels.debug;

if (env.TRACE_LOG) {
    logLevel = LogLevels.trace;
}

export const logger: ConsolaInstance = createConsola({
    level: logLevel,
}).setReporters([
    new DefaultReporter({
        addTypeColon: false,
        padding: 8,
        dateFirstPosition: false,
    }),
]);
