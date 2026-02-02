#!/usr/bin/env node
const { execFileSync } = require("child_process");
const { readFileSync, writeFileSync } = require("fs");
const { resolve, basename } = require("path");

const DEFAULT_BUCKET = "ota-charlies-farm";
const DEFAULT_PREFIX = "egg/";
const DEFAULT_REGION = "us-east-2";

const bucket = process.env.OTA_BUCKET ?? DEFAULT_BUCKET;
const prefix = process.env.OTA_PREFIX ?? DEFAULT_PREFIX;
const region = process.env.OTA_REGION ?? DEFAULT_REGION;
const overrideHost = process.env.OTA_BASE_URL;
const overrideVersion = process.env.OTA_VERSION;

const trimSlashes = (value = "") => value.replace(/^\/+|\/+$/g, "");
const ensureTrailingSlash = (value = "") =>
  value.endsWith("/") ? value : `${value}/`;

const normalizedPrefix = ensureTrailingSlash(trimSlashes(prefix));

const runAwsList = () => {
  const args = [
    "s3api",
    "list-objects-v2",
    "--bucket",
    bucket,
    "--prefix",
    normalizedPrefix,
    "--delimiter",
    "/",
    "--region",
    region,
    "--output",
    "json",
  ];

  const result = execFileSync("aws", args, { encoding: "utf8" });
  return JSON.parse(result);
};

const pickLatestPrefix = () => {
  if (overrideVersion) {
    return `${normalizedPrefix}${trimSlashes(overrideVersion)}/`;
  }
  const response = runAwsList();
  const prefixes = (response.CommonPrefixes || [])
    .map((entry) => entry.Prefix)
    .filter(Boolean);
  if (!prefixes.length) {
    throw new Error(`no prefixes found under s3://${bucket}/${normalizedPrefix}`);
  }
  prefixes.sort();
  return prefixes[prefixes.length - 1];
};

const buildBaseUrl = () => {
  const releasePrefix = pickLatestPrefix();
  const host = overrideHost ?? `https://${bucket}.s3.${region}.amazonaws.com`;
  return `${host.replace(/\/$/, "")}/${releasePrefix}`;
};

const getDeviceManifests = () => {
  const config = JSON.parse(readFileSync("config/eggs.json", "utf8"));
  const devices = config.devices || [config.device]; // Support both old and new format
  
  return devices.flatMap((device) =>
    device.manifests.map((manifest) => ({
      deviceId: device.id,
      manifestPath: manifest.manifest,
    }))
  );
};

const pickLatestPrefixForDevice = (devicePrefix) => {
  const normalizedDevicePrefix = ensureTrailingSlash(trimSlashes(devicePrefix));
  
  if (overrideVersion) {
    return `${normalizedDevicePrefix}${trimSlashes(overrideVersion)}/`;
  }
  
  const args = [
    "s3api",
    "list-objects-v2",
    "--bucket",
    bucket,
    "--prefix",
    normalizedDevicePrefix,
    "--delimiter",
    "/",
    "--region",
    region,
    "--output",
    "json",
  ];

  const result = execFileSync("aws", args, { encoding: "utf8" });
  const response = JSON.parse(result);
  const prefixes = (response.CommonPrefixes || [])
    .map((entry) => entry.Prefix)
    .filter(Boolean);
    
  if (!prefixes.length) {
    throw new Error(`no prefixes found under s3://${bucket}/${normalizedDevicePrefix}`);
  }
  
  prefixes.sort();
  return prefixes[prefixes.length - 1];
};

const buildBaseUrlForDevice = (devicePrefix) => {
  const releasePrefix = pickLatestPrefixForDevice(devicePrefix);
  const host = overrideHost ?? `https://${bucket}.s3.${region}.amazonaws.com`;
  return `${host.replace(/\/$/, "")}/${releasePrefix}`;
};

const rewriteManifestForDevice = (manifestPath, baseUrl, deviceId) => {
  const fullPath = resolve(manifestPath);
  const manifest = JSON.parse(readFileSync(fullPath, "utf8"));
  
  manifest.builds.forEach((build) => {
    build.parts.forEach((part) => {
      const filename = basename(part.path);
      part.path = `${ensureTrailingSlash(baseUrl)}${filename}`;
    });
  });
  
  writeFileSync(fullPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`  Updated: ${manifestPath}`);
};

try {
  const deviceManifests = getDeviceManifests();
  
  // Group manifests by device
  const deviceGroups = {};
  deviceManifests.forEach(({ deviceId, manifestPath }) => {
    if (!deviceGroups[deviceId]) {
      deviceGroups[deviceId] = [];
    }
    deviceGroups[deviceId].push(manifestPath);
  });
  
  // Process each device type
  Object.entries(deviceGroups).forEach(([deviceId, manifestPaths]) => {
    // Extract device prefix from device ID (e.g., "mother-hen-egg" -> "egg")
    const devicePrefix = deviceId.includes("egg") ? "egg/" : 
                        deviceId.includes("controller") ? "controller/" : 
                        prefix; // fallback to default
    
    console.log(`\nProcessing device: ${deviceId}`);
    const baseUrl = buildBaseUrlForDevice(devicePrefix);
    console.log(`  Using OTA release base: ${baseUrl}`);
    
    manifestPaths.forEach((manifestPath) => {
      rewriteManifestForDevice(manifestPath, baseUrl, deviceId);
    });
  });
  
  console.log("\n✓ All manifests updated successfully");
} catch (error) {
  console.error("Failed to update manifests:", error);
  process.exit(1);
}
