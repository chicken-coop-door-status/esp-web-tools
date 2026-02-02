# ESP Web Tools

Allow flashing ESPHome or other ESP-based firmwares via the browser. Will automatically detect the board type and select a supported firmware. [See website for full documentation.](https://esphome.github.io/esp-web-tools/)

```html
<esp-web-install-button
  manifest="firmware_esphome/manifest.json"
></esp-web-install-button>
```

Example manifest:

```json
{
  "name": "ESPHome",
  "version": "2021.10.3",
  "home_assistant_domain": "esphome",
  "funding_url": "https://esphome.io/guides/supporters.html",
  "builds": [
    {
      "chipFamily": "ESP32",
      "parts": [
        { "path": "bootloader_dout_40m.bin", "offset": 4096 },
        { "path": "partitions.bin", "offset": 32768 },
        { "path": "boot_app0.bin", "offset": 57344 },
        { "path": "esp32.bin", "offset": 65536 }
      ]
    },
    {
      "chipFamily": "ESP32-C3",
      "parts": [
        { "path": "bootloader_dout_40m.bin", "offset": 0 },
        { "path": "partitions.bin", "offset": 32768 },
        { "path": "boot_app0.bin", "offset": 57344 },
        { "path": "esp32-c3.bin", "offset": 65536 }
      ]
    },
    {
      "chipFamily": "ESP32-S2",
      "parts": [
        { "path": "bootloader_dout_40m.bin", "offset": 4096 },
        { "path": "partitions.bin", "offset": 32768 },
        { "path": "boot_app0.bin", "offset": 57344 },
        { "path": "esp32-s2.bin", "offset": 65536 }
      ]
    },
    {
      "chipFamily": "ESP32-S3",
      "parts": [
        { "path": "bootloader_dout_40m.bin", "offset": 4096 },
        { "path": "partitions.bin", "offset": 32768 },
        { "path": "boot_app0.bin", "offset": 57344 },
        { "path": "esp32-s3.bin", "offset": 65536 }
      ]
    },
    {
      "chipFamily": "ESP8266",
      "parts": [
        { "path": "esp8266.bin", "offset": 0 }
      ]
    }
  ]
}
```

## Development

Run `script/develop`. This starts a server. Open it on http://localhost:5001.

## OTA manifest updates

`script/update-manifests.js` rewrites each manifest's `parts[].path` so they always point at the newest release under `s3://ota-charlies-farm/{device}/`. The script expects the AWS CLI to be available and uses the bucket/prefix/region from the following environment variables (defaults shown):

| Variable | Default | Purpose |
| --- | --- | --- |
| `OTA_BUCKET` | `ota-charlies-farm` | S3 bucket name |
| `OTA_PREFIX` | `egg/` | Default prefix (used for backward compatibility) |
| `OTA_REGION` | `us-east-2` | Region used to build the HTTPS host when `OTA_BASE_URL` is unset |
| `OTA_BASE_URL` | `https://OTA_BUCKET.s3.OTA_REGION.amazonaws.com` | Base URL that gets combined with the newest prefix |
| `OTA_VERSION` | _empty_ | Override to target a specific release (skips the AWS call) |

The script automatically detects device types from `config/eggs.json` and updates manifests for each device:
- **Egg** manifests point to `s3://ota-charlies-farm/egg/<release>/`
- **Controller** manifests point to `s3://ota-charlies-farm/controller/<release>/`

`amplify.yml` already runs `node script/update-manifests.js` during the pre-build phase, so deployments always pull the latest release folders before flashing. When you're working locally and don't have the AWS CLI configured, set `OTA_VERSION` (for example `OTA_VERSION=ci-test`) before running `script/build` so the manifests stay valid without hitting AWS.

[![ESPHome - A project from the Open Home Foundation](https://www.openhomefoundation.org/badges/esphome.png)](https://www.openhomefoundation.org/)
