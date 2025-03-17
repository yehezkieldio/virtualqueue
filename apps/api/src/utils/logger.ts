import { DefaultReporter } from "@amarislabs/logger";
import { env } from "@virtualqueue/environment";
import { type ConsolaInstance, type ConsolaReporter, LogLevels, type LogObject, createConsola } from "consola";
import { $fetch } from "ofetch";

let logLevel: number =
    env.NODE_ENV === "test" ? LogLevels.silent : env.NODE_ENV === "production" ? LogLevels.info : LogLevels.debug;

if (env.TRACE_LOG) {
    logLevel = LogLevels.trace;
}

const LogLevel = {
    0: "error",
    1: "warn",
    2: "log",
    3: "info",
    4: "debug",
    5: "trace",
} as const;

export interface LokiOptions {
    baseURL: string;
    interval?: number;
    user?: string;
    password?: string;
    labels?: Record<string, string>;
}

type LogEntry = {
    labels: Record<string, string | number>;
    entries: {
        timestamp: Date;
        message: string | undefined;
    }[];
};

export class LokiReporter implements ConsolaReporter {
    private buffer: LogEntry[] = [];
    private interval?: NodeJS.Timer = undefined;
    private options: LokiOptions;

    constructor(lokiOptions: LokiOptions) {
        this.options = lokiOptions;
    }

    public async flush() {
        try {
            const headers: HeadersInit = {};

            if (this.options.user && this.options.password) {
                headers.Authorization = `Basic ${Buffer.from(`${this.options.user}:${this.options.password}`).toString("base64")}`;
            }

            console.log("Flushing logs to Loki");

            // const flush = await fetch(`${this.options.baseURL}/loki/api/v1/push`, {
            //     method: "POST",
            //     headers,
            //     body: JSON.stringify({
            //         streams: this.buffer.map((logStream) => ({
            //             stream: logStream.labels,
            //             values: logStream.entries.map((entry) => [
            //                 JSON.stringify(entry.timestamp.getTime() * 1000 * 1000), // Loki expects nanoseconds
            //                 entry.message,
            //             ]),
            //         })),
            //     }),
            // });

            // if (!flush.ok) {
            //     console.error(`Error pushing logs to Loki: ${flush.statusText}`);
            // }

            // console.log(`Logs pushed to Loki: ${flush.statusText}`);

            await $fetch("/loki/api/v1/push", {
                baseURL: this.options.baseURL,
                method: "POST",
                headers,
                body: {
                    streams: this.buffer.map((logStream) => ({
                        stream: logStream.labels,
                        values: logStream.entries.map((entry) => [
                            JSON.stringify(entry.timestamp.getTime() * 1000 * 1000), // Loki expects nanoseconds
                            entry.message,
                        ]),
                    })),
                },
            });

            this.buffer = [];
        } catch (error) {
            console.error(`Error pushing logs to Loki: ${error}`);
        }
    }

    public log(logObj: LogObject) {
        if (!this.interval) {
            const intervalMs = this.options.interval ?? 5000;
            this.interval = setInterval(() => {
                if (this.buffer.length > 0) {
                    this.flush();
                }
            }, intervalMs);
        }

        const defaultLabels = {
            level: LogLevel[logObj.level as keyof typeof LogLevel],
        };

        this.buffer.push({
            labels: Object.assign({}, defaultLabels, this.options.labels),
            entries: [
                {
                    timestamp: logObj.date,
                    message: logObj.args[0],
                },
            ],
        });
    }
}

export const logger: ConsolaInstance = createConsola({
    level: logLevel,
}).setReporters([
    new DefaultReporter({
        addTypeColon: false,
        padding: 8,
        dateFirstPosition: false,
    }),
    new LokiReporter({
        baseURL: "http://localhost:3100",
        labels: {
            app: "virtualqueue-api",
            env: env.NODE_ENV,
        },
    } as LokiOptions),
]);
