import os from "node:os";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Resource } from "@opentelemetry/resources";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { Elysia } from "elysia";
import { logger } from "#utils/logger";

const SERVICE_NAME = "virtualqueue-api";
const SERVICE_VERSION = "0.0.0";

const prometheusExporter = new PrometheusExporter({
    port: 9464,
    endpoint: "/metrics",
});

const metricExporter = new OTLPMetricExporter({
    url: "http://localhost:4318/v1/metrics",
});

const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 1000,
});

const meterProvider = new MeterProvider({
    resource: new Resource({
        [ATTR_SERVICE_NAME]: SERVICE_NAME,
        [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
    }),
    readers: [metricReader, prometheusExporter],
});

export const meter = meterProvider.getMeter("virtualqueue-metrics");

const requestCounter = meter.createCounter("http_requests_total", {
    description: "Total number of HTTP requests",
});

export const requestDurationHistogram = meter.createHistogram("http_request_duration_seconds", {
    description: "HTTP request duration in seconds",
});

const memoryUsageGauge = meter.createObservableGauge("process_memory_usage_bytes", {
    description: "Memory usage of the Node.js process",
});

const cpuUsageGauge = meter.createObservableGauge("process_cpu_usage_percentage", {
    description: "CPU usage percentage of the Node.js process",
});

const systemMemoryGauge = meter.createObservableGauge("system_memory_usage", {
    description: "System memory usage statistics",
});

const systemLoadGauge = meter.createObservableGauge("system_load_average", {
    description: "System load average",
});

let lastCpuUsage = process.cpuUsage();
let lastCpuUsageTime: number = Date.now();

memoryUsageGauge.addCallback((observableResult) => {
    const memoryUsage = process.memoryUsage();

    observableResult.observe(memoryUsage.rss, { type: "rss" });
    observableResult.observe(memoryUsage.heapTotal, { type: "heapTotal" });
    observableResult.observe(memoryUsage.heapUsed, { type: "heapUsed" });
    observableResult.observe(memoryUsage.external, { type: "external" });
});

cpuUsageGauge.addCallback((observableResult) => {
    const currentTime = Date.now();
    const elapsedMs: number = currentTime - lastCpuUsageTime;

    if (elapsedMs > 0) {
        const currentCpuUsage = process.cpuUsage();

        const userUsageMicros: number = currentCpuUsage.user - lastCpuUsage.user;
        const systemUsageMicros: number = currentCpuUsage.system - lastCpuUsage.system;
        const totalUsageMicros: number = userUsageMicros + systemUsageMicros;

        const cpuPercent: number = (totalUsageMicros / 1000 / elapsedMs) * 100;

        observableResult.observe(cpuPercent);

        lastCpuUsage = currentCpuUsage;
        lastCpuUsageTime = currentTime;
    }
});

systemMemoryGauge.addCallback((observableResult) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    observableResult.observe(totalMem, { type: "total" });
    observableResult.observe(freeMem, { type: "free" });
    observableResult.observe(usedMem, { type: "used" });
    observableResult.observe((usedMem / totalMem) * 100, { type: "usagePercent" });
});

systemLoadGauge.addCallback((observableResult) => {
    const loadAvg: number[] = os.loadavg();

    observableResult.observe(loadAvg[0] as number, { period: "1m" });
    observableResult.observe(loadAvg[1] as number, { period: "5m" });
    observableResult.observe(loadAvg[2] as number, { period: "15m" });
});

export const useOpenTelemetryMiddleware = () => {
    return opentelemetry({
        serviceName: SERVICE_NAME,
        spanProcessors: [
            new BatchSpanProcessor(
                new OTLPTraceExporter({
                    url: "http://localhost:4318/v1/traces",
                })
            ),
        ],
        resource: new Resource({
            [ATTR_SERVICE_NAME]: SERVICE_NAME,
            [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
        }),
    });
};

export const useMetricsMiddleware = () => {
    return new Elysia().onRequest(({ request }) => {
        requestCounter.add(1, {
            method: request.method,
            path: new URL(request.url).pathname,
        });
    });
};

export const startResourceMetricsCollection = () => {
    logger.info("Resource metrics collection started!");
};
