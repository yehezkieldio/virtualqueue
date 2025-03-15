import os from "node:os";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import Elysia from "elysia";
import { logger } from "#utils/logger";

const prometheusExporter = new PrometheusExporter({ port: 9464 });

const meterProvider = new MeterProvider({
    readers: [prometheusExporter],
});

const meter = meterProvider.getMeter("memory-metrics");

const requestCounter = meter.createCounter("http_requests_total", {
    description: "Total number of HTTP requests",
});

const memoryUsageGauge = meter.createObservableGauge("process_memory_usage_bytes", {
    description: "Memory usage of the process",
});

const cpuUsageGauge = meter.createObservableGauge("process_cpu_usage_percentage", {
    description: "CPU usage percentage of the process",
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

export const useMetricsMiddleware = () => {
    return new Elysia({
        name: "Middleware.Metrics",
    }).onRequest(({ request }) => {
        requestCounter.add(1, {
            method: request.method,
            path: new URL(request.url).pathname,
        });
    });
};

export const startMetrics = () => {
    logger.info("Metrics collection started!");
};
