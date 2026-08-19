# Third-party notices

This runtime contains code derived from **ZXing Core 3.5.4** (`com.google.zxing:core:3.5.4`).

- Project: ZXing (Zebra Crossing)
- Upstream: https://github.com/zxing/zxing
- License: Apache License 2.0
- ToolHub build step relocates the ZXing package namespace before D8 compilation to reduce host-classpath conflicts.

The ToolHub bridge class is separate integration code. The generated Android runtime is installed on-device at `shortx.getShortXDir()/lib` and is loaded only on explicit QR decode requests.
