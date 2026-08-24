package toolhub.runtime.qr;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.NotFoundException;
import com.google.zxing.Result;
import com.google.zxing.ResultPoint;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.common.HybridBinarizer;

import java.io.File;
import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ToolHubQrRuntime {
    private static final String VERSION = "3.5.4-r2";
    private static final int DEFAULT_MAX_PIXELS = 2_000_000;
    private static final int MIN_MAX_PIXELS = 300_000;
    private static final int MAX_MAX_PIXELS = 4_000_000;
    private static final Pattern MAX_PIXELS_PATTERN = Pattern.compile("\\\"maxPixels\\\"\\s*:\\s*(\\d+)");

    private ToolHubQrRuntime() {}

    public static String getVersion() {
        return VERSION;
    }

    public static String decodeFile(String absolutePath, String optionsJson) {
        final long started = System.currentTimeMillis();
        Bitmap bitmap = null;
        try {
            if (absolutePath == null || absolutePath.length() == 0) {
                return failure("QR_IMAGE_DECODE_FAILED", "image path empty", started, 0, 0, 0, 0, 1);
            }
            File file = new File(absolutePath);
            if (!file.isFile() || file.length() <= 0) {
                return failure("QR_IMAGE_DECODE_FAILED", "image unavailable", started, 0, 0, 0, 0, 1);
            }

            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(absolutePath, bounds);
            int sourceWidth = bounds.outWidth;
            int sourceHeight = bounds.outHeight;
            if (sourceWidth <= 0 || sourceHeight <= 0) {
                return failure("QR_IMAGE_DECODE_FAILED", "image bounds invalid", started, sourceWidth, sourceHeight, 0, 0, 1);
            }

            int maxPixels = readMaxPixels(optionsJson);
            int sampleSize = computeSampleSize(sourceWidth, sourceHeight, maxPixels);
            BitmapFactory.Options actual = new BitmapFactory.Options();
            actual.inPreferredConfig = Bitmap.Config.ARGB_8888;
            actual.inSampleSize = sampleSize;
            bitmap = BitmapFactory.decodeFile(absolutePath, actual);
            if (bitmap == null) {
                return failure("QR_IMAGE_DECODE_FAILED", "bitmap decode returned null", started, sourceWidth, sourceHeight, 0, 0, sampleSize);
            }

            int width = bitmap.getWidth();
            int height = bitmap.getHeight();
            if (width <= 0 || height <= 0 || ((long) width * (long) height) > MAX_MAX_PIXELS) {
                return failure("QR_IMAGE_DECODE_FAILED", "decoded image size invalid", started, sourceWidth, sourceHeight, width, height, sampleSize);
            }

            int[] pixels = new int[width * height];
            bitmap.getPixels(pixels, 0, width, 0, 0, width, height);
            bitmap.recycle();
            bitmap = null;

            Result result;
            try {
                result = decodeOnce(pixels, width, height, false, false);
            } catch (NotFoundException firstMiss) {
                result = decodeOnce(pixels, width, height, true, true);
            }
            if (result == null) {
                return failure("QR_NOT_FOUND", "", started, sourceWidth, sourceHeight, width, height, sampleSize);
            }
            return success(result, started, sourceWidth, sourceHeight, width, height, sampleSize);
        } catch (NotFoundException notFound) {
            return failure("QR_NOT_FOUND", "", started, 0, 0, 0, 0, 1);
        } catch (OutOfMemoryError oom) {
            return failure("QR_IMAGE_DECODE_FAILED", "image memory limit", started, 0, 0, 0, 0, 1);
        } catch (Throwable error) {
            return failure("QR_RUNTIME_ERROR", safeError(error), started, 0, 0, 0, 0, 1);
        } finally {
            if (bitmap != null && !bitmap.isRecycled()) {
                try { bitmap.recycle(); } catch (Throwable ignored) {}
            }
        }
    }

    private static Result decodeOnce(int[] pixels, int width, int height, boolean tryHarder, boolean alsoInverted)
            throws NotFoundException {
        RGBLuminanceSource source = new RGBLuminanceSource(width, height, pixels);
        BinaryBitmap binary = new BinaryBitmap(new HybridBinarizer(source));
        Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
        hints.put(DecodeHintType.POSSIBLE_FORMATS, Collections.singletonList(BarcodeFormat.QR_CODE));
        if (tryHarder) hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
        if (alsoInverted) hints.put(DecodeHintType.ALSO_INVERTED, Boolean.TRUE);
        MultiFormatReader reader = new MultiFormatReader();
        try {
            return reader.decode(binary, hints);
        } finally {
            reader.reset();
        }
    }

    private static int readMaxPixels(String optionsJson) {
        int value = DEFAULT_MAX_PIXELS;
        if (optionsJson != null) {
            Matcher matcher = MAX_PIXELS_PATTERN.matcher(optionsJson);
            if (matcher.find()) {
                try { value = Integer.parseInt(matcher.group(1)); } catch (Throwable ignored) {}
            }
        }
        if (value < MIN_MAX_PIXELS) value = MIN_MAX_PIXELS;
        if (value > MAX_MAX_PIXELS) value = MAX_MAX_PIXELS;
        return value;
    }

    private static int computeSampleSize(int width, int height, int maxPixels) {
        int sample = 1;
        while (((long) ceilDiv(width, sample) * (long) ceilDiv(height, sample)) > maxPixels && sample < 64) {
            sample <<= 1;
        }
        return sample;
    }

    private static int ceilDiv(int value, int divisor) {
        return (value + divisor - 1) / divisor;
    }

    private static String success(Result result, long started, int sourceWidth, int sourceHeight,
                                  int decodedWidth, int decodedHeight, int sampleSize) {
        StringBuilder out = new StringBuilder(512);
        out.append('{');
        field(out, "ok", true).append(',');
        field(out, "code", "QR_SUCCESS").append(',');
        field(out, "text", result.getText() == null ? "" : result.getText()).append(',');
        field(out, "format", result.getBarcodeFormat() == null ? "" : result.getBarcodeFormat().toString()).append(',');
        field(out, "rawBytesBase64", "").append(',');
        out.append("\"points\":[");
        ResultPoint[] points = result.getResultPoints();
        if (points != null) {
            for (int i = 0; i < points.length; i++) {
                if (i > 0) out.append(',');
                ResultPoint point = points[i];
                if (point == null) {
                    out.append("null");
                } else {
                    out.append('{');
                    out.append("\"x\":").append(point.getX()).append(',');
                    out.append("\"y\":").append(point.getY());
                    out.append('}');
                }
            }
        }
        out.append("],");
        numberField(out, "sourceWidth", sourceWidth).append(',');
        numberField(out, "sourceHeight", sourceHeight).append(',');
        numberField(out, "decodedWidth", decodedWidth).append(',');
        numberField(out, "decodedHeight", decodedHeight).append(',');
        numberField(out, "sampleSize", sampleSize).append(',');
        numberField(out, "durationMs", System.currentTimeMillis() - started).append(',');
        field(out, "runtimeVersion", VERSION);
        out.append('}');
        return out.toString();
    }

    private static String failure(String code, String error, long started, int sourceWidth, int sourceHeight,
                                  int decodedWidth, int decodedHeight, int sampleSize) {
        StringBuilder out = new StringBuilder(320);
        out.append('{');
        field(out, "ok", false).append(',');
        field(out, "code", code).append(',');
        field(out, "text", "").append(',');
        field(out, "format", "").append(',');
        field(out, "error", error == null ? "" : error).append(',');
        numberField(out, "sourceWidth", sourceWidth).append(',');
        numberField(out, "sourceHeight", sourceHeight).append(',');
        numberField(out, "decodedWidth", decodedWidth).append(',');
        numberField(out, "decodedHeight", decodedHeight).append(',');
        numberField(out, "sampleSize", sampleSize).append(',');
        numberField(out, "durationMs", System.currentTimeMillis() - started).append(',');
        field(out, "runtimeVersion", VERSION);
        out.append('}');
        return out.toString();
    }

    private static StringBuilder field(StringBuilder out, String name, String value) {
        out.append('"').append(name).append("\":\"").append(jsonEscape(value)).append('"');
        return out;
    }

    private static StringBuilder field(StringBuilder out, String name, boolean value) {
        out.append('"').append(name).append("\":").append(value ? "true" : "false");
        return out;
    }

    private static StringBuilder numberField(StringBuilder out, String name, long value) {
        out.append('"').append(name).append("\":").append(value);
        return out;
    }

    private static String jsonEscape(String value) {
        if (value == null || value.length() == 0) return "";
        StringBuilder out = new StringBuilder(value.length() + 16);
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            switch (ch) {
                case '"': out.append("\\\""); break;
                case '\\': out.append("\\\\"); break;
                case '\b': out.append("\\b"); break;
                case '\f': out.append("\\f"); break;
                case '\n': out.append("\\n"); break;
                case '\r': out.append("\\r"); break;
                case '\t': out.append("\\t"); break;
                default:
                    if (ch < 0x20) {
                        String hex = Integer.toHexString(ch);
                        out.append("\\u");
                        for (int pad = hex.length(); pad < 4; pad++) out.append('0');
                        out.append(hex);
                    } else {
                        out.append(ch);
                    }
            }
        }
        return out.toString();
    }

    private static String safeError(Throwable error) {
        if (error == null) return "runtime error";
        String text = error.getClass().getSimpleName();
        String message = error.getMessage();
        if (message != null && message.length() > 0) text += ": " + message.replace('\n', ' ').replace('\r', ' ');
        if (text.length() > 180) text = text.substring(0, 180);
        return text;
    }
}
