import pino from "pino";
import { getEnv } from "@rexfoot/config";

export const logger = pino({
  level: getEnv().LOG_LEVEL,
  base: { service: "rexfoot-worker" },
});
