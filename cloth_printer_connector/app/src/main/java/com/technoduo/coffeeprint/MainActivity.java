package com.technoduo.coffeeprint;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final int REQUEST_BT = 41;
    private static final String PREFS = "coffee_print_connector";
    private static final String VERSION = "1.0.1";
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final List<BluetoothDevice> devices = new ArrayList<>();
    private SharedPreferences prefs;
    private TextView status;
    private Spinner printerSpinner;
    private Button saveButton;
    private Button connectButton;
    private Uri pendingLink;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        buildUi();
        handleIntent(getIntent());
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private TextView text(String value, int size, int color) {
        TextView v = new TextView(this);
        v.setText(value); v.setTextSize(size); v.setTextColor(color);
        v.setPadding(0, 8, 0, 8);
        return v;
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(42, 42, 42, 42);
        root.setBackgroundColor(Color.rgb(255, 248, 239));

        TextView logo = text("COFFEE CORNER", 13, Color.rgb(232, 117, 50));
        logo.setGravity(Gravity.CENTER); root.addView(logo);
        TextView title = text("Print Connector", 30, Color.rgb(36, 23, 15));
        title.setGravity(Gravity.CENTER); title.setTypeface(null, 1); root.addView(title);
        TextView sub = text("80mm Bluetooth receipt printing", 14, Color.rgb(121, 106, 97));
        sub.setGravity(Gravity.CENTER); root.addView(sub);

        status = text("Checking setup...", 15, Color.rgb(91, 53, 36));
        status.setPadding(24, 28, 24, 28); root.addView(status);
        root.addView(text("Paired printer", 13, Color.rgb(36, 23, 15)));
        printerSpinner = new Spinner(this); root.addView(printerSpinner);

        saveButton = new Button(this);
        saveButton.setText("TEST PRINT");
        saveButton.setTextColor(Color.WHITE);
        saveButton.setBackgroundColor(Color.rgb(232, 117, 50));
        saveButton.setOnClickListener(v -> testCurrentPrinter());
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(-1, dp(56));
        buttonParams.setMargins(0, dp(20), 0, dp(10)); root.addView(saveButton, buttonParams);

        connectButton = new Button(this);
        connectButton.setText("OPEN BLUETOOTH SETTINGS");
        connectButton.setOnClickListener(v -> startActivity(new Intent(Settings.ACTION_BLUETOOTH_SETTINGS)));
        root.addView(connectButton, new LinearLayout.LayoutParams(-1, dp(56)));

        TextView help = text("Pair the Bluetooth printer in Android settings first. Then open this app, select the printer, and test print. Billing pairing happens from the billing software's Connect Printer button.", 13, Color.rgb(121, 106, 97));
        help.setPadding(0, 28, 0, 0); root.addView(help);
        setContentView(root);
        ensurePermissionAndLoad();
    }

    private void ensurePermissionAndLoad() {
        if (Build.VERSION.SDK_INT >= 31 && checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT}, REQUEST_BT);
        } else loadPairedDevices();
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQUEST_BT && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            loadPairedDevices();
            if (pendingLink != null) { Uri link = pendingLink; pendingLink = null; processLink(link); }
        } else setStatus("Bluetooth permission is required.", true);
    }

    private void loadPairedDevices() {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        devices.clear();
        List<String> names = new ArrayList<>();
        if (adapter == null) {
            names.add("Bluetooth not supported");
        } else if (!adapter.isEnabled()) {
            names.add("Turn Bluetooth on");
        } else {
            try {
                Set<BluetoothDevice> bonded = adapter.getBondedDevices();
                devices.addAll(bonded);
                for (BluetoothDevice d : devices) names.add(safeName(d) + "  •  " + d.getAddress());
            } catch (SecurityException e) {
                names.add("Bluetooth permission required");
            }
        }
        printerSpinner.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, names));
        String saved = prefs.getString("printerMac", "");
        for (int i = 0; i < devices.size(); i++) if (devices.get(i).getAddress().equals(saved)) printerSpinner.setSelection(i);
        updateReadyStatus();
    }

    private String safeName(BluetoothDevice device) {
        try { return device.getName() == null ? "Bluetooth printer" : device.getName(); }
        catch (SecurityException e) { return "Bluetooth printer"; }
    }

    private void updateReadyStatus() {
        String printer = prefs.getString("printerName", "");
        boolean paired = !prefs.getString("accessToken", "").isEmpty();
        if (!printer.isEmpty()) setStatus((paired ? "Ready • Billing paired\n" : "Printer saved • Pair billing next\n") + printer + "\nPaper: 80mm / 3 inch", false);
        else setStatus("Select your paired 80mm printer.", false);
    }

    private void saveAndTest() {
        if (devices.isEmpty() || printerSpinner.getSelectedItemPosition() >= devices.size()) {
            Toast.makeText(this, "Pair and select the printer first", Toast.LENGTH_LONG).show(); return;
        }
        BluetoothDevice device = devices.get(printerSpinner.getSelectedItemPosition());
        prefs.edit().putString("printerMac", device.getAddress()).putString("printerName", safeName(device)).apply();
        setBusy("Connecting and printing test...");
        worker.execute(() -> {
            try {
                printBytes(device, testReceipt());
                postStatus(true);
                runOnUiThread(() -> { setIdle(); setStatus("Test printed successfully\n" + safeName(device) + "\nPaper: 80mm / 3 inch", false); });
            } catch (Exception e) {
                postStatus(false);
                showError("Test print failed: " + cleanError(e));
            }
        });
    }

    private void handleIntent(Intent intent) {
        Uri uri = intent == null ? null : intent.getData();
        if (uri == null || !"cloth-print".equals(uri.getScheme())) return;
        if (Build.VERSION.SDK_INT >= 31 && checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            pendingLink = uri; ensurePermissionAndLoad(); return;
        }
        processLink(uri);
    }

    private void processLink(Uri uri) {
        if ("connect".equals(uri.getHost())) {
            if (uri.getQueryParameter("pairingToken") != null) pair(uri);
            else loadPairedDevices();
            return;
        }
        else if ("print".equals(uri.getHost())) printJob(uri);
        else if ("test".equals(uri.getHost())) testFromLink(uri);
    }

    private void testCurrentPrinter() {
        if (devices.isEmpty() || printerSpinner.getSelectedItemPosition() >= devices.size()) {
            Toast.makeText(this, "Pair and select the printer first", Toast.LENGTH_LONG).show();
            return;
        }
        BluetoothDevice device = devices.get(printerSpinner.getSelectedItemPosition());
        prefs.edit().putString("printerMac", device.getAddress()).putString("printerName", safeName(device)).apply();
        setBusy("Printing test receipt...");
        worker.execute(() -> {
            try {
                printBytes(device, testReceipt());
                postStatus(true);
                runOnUiThread(() -> {
                    setIdle();
                    setStatus("Test printed successfully\n" + safeName(device) + "\nPaper: 80mm / 3 inch", false);
                });
            } catch (Exception e) {
                postStatus(false);
                showError("Test print failed: " + cleanError(e));
            }
        });
    }

    private void testFromLink(Uri uri) {
        String printerMac = uri.getQueryParameter("printerMac");
        if (printerMac == null || printerMac.isEmpty()) {
            testCurrentPrinter();
            return;
        }
        if (prefs.getString("printerMac", "").isEmpty()) {
            prefs.edit().putString("printerMac", printerMac).apply();
        }
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            showError("Bluetooth not supported."); return;
        }
        setBusy("Printing test receipt...");
        worker.execute(() -> {
            try {
                BluetoothDevice device = adapter.getRemoteDevice(printerMac);
                printBytes(device, testReceipt());
                postStatus(true);
                runOnUiThread(() -> {
                    setIdle();
                    setStatus("Test printed successfully", false);
                });
            } catch (Exception e) {
                postStatus(false);
                showError("Test print failed: " + cleanError(e));
            }
        });
    }

    private void pair(Uri uri) {
        String baseUrl = uri.getQueryParameter("baseUrl");
        String token = uri.getQueryParameter("pairingToken");
        String returnUrl = uri.getQueryParameter("returnUrl");
        if (baseUrl == null || token == null || !baseUrl.startsWith("https://")) {
            showError("Invalid billing pairing link."); return;
        }
        setBusy("Pairing with billing software...");
        worker.execute(() -> {
            try {
                String deviceId = prefs.getString("bridgeDeviceId", "");
                if (deviceId.isEmpty()) deviceId = UUID.randomUUID().toString();
                JSONObject body = new JSONObject().put("pairingToken", token).put("bridgeDeviceId", deviceId).put("appVersion", VERSION);
                JSONObject response = request("POST", baseUrl + "/api/bridge/verify-pairing", body, null);
                if (!response.optBoolean("success")) throw new Exception(response.optString("error", "Pairing failed"));
                prefs.edit().putString("baseUrl", baseUrl).putString("accessToken", response.getString("accessToken"))
                        .putString("bridgeDeviceId", deviceId).putString("shopId", response.getJSONObject("bridgeDevice").getString("shopId")).apply();
                postStatus(!prefs.getString("printerMac", "").isEmpty());
                runOnUiThread(() -> {
                    setIdle(); updateReadyStatus(); Toast.makeText(this, "Billing paired successfully", Toast.LENGTH_LONG).show();
                    returnTo(returnUrl);
                });
            } catch (Exception e) { showError("Pairing failed: " + cleanError(e)); }
        });
    }

    private void printJob(Uri uri) {
        String billId = uri.getQueryParameter("billId");
        String shopId = uri.getQueryParameter("shopId");
        String requestToken = uri.getQueryParameter("requestToken");
        String returnUrl = uri.getQueryParameter("returnUrl");
        String baseUrl = uri.getQueryParameter("baseUrl");
        if (baseUrl == null || baseUrl.isEmpty()) baseUrl = prefs.getString("baseUrl", "");
        String accessToken = prefs.getString("accessToken", "");
        String mac = prefs.getString("printerMac", "");
        if (baseUrl.isEmpty()) { showError("Open billing and connect the printer first."); return; }
        if (mac.isEmpty()) { showError("Select the Bluetooth printer and run Test Print first."); return; }
        if (billId == null || shopId == null || requestToken == null) { showError("Invalid print request."); return; }
        final String jobBaseUrl = baseUrl;
        final String jobAccessToken = accessToken;
        setBusy("Printing bill...");
        worker.execute(() -> {
            String jobId = null;
            try {
                String query = "?billId=" + enc(billId) + "&shopId=" + enc(shopId) + "&requestToken=" + enc(requestToken);
                JSONObject response = request("GET", jobBaseUrl + (jobAccessToken.isEmpty() ? "/api/bridge/direct-job" : "/api/bridge/print-job") + query, null, jobAccessToken.isEmpty() ? null : jobAccessToken);
                if (!response.optBoolean("success")) throw new Exception(response.optString("error", "Could not load bill"));
                JSONObject job = response.getJSONObject("job"); jobId = job.optString("id");
                BluetoothDevice device = BluetoothAdapter.getDefaultAdapter().getRemoteDevice(mac);
                byte[] receipt = receiptBytes(job.getJSONObject("receipt"));
                int copies = Math.max(1, job.optInt("copies", 1));
                for (int i = 0; i < copies; i++) printBytes(device, receipt);
                reportResult(jobBaseUrl, jobAccessToken, billId, shopId, jobId, "printed", null);
                postStatus(true);
                runOnUiThread(() -> {
                    setIdle(); setStatus("Bill printed successfully\n" + prefs.getString("printerName", "Bluetooth printer"), false);
                    Toast.makeText(this, "Bill printed", Toast.LENGTH_SHORT).show(); returnTo(returnUrl);
                });
            } catch (Exception e) {
                reportResult(jobBaseUrl, jobAccessToken, billId, shopId, jobId, "failed", "PRINT_FAILED");
                postStatus(false); showError("Print failed: " + cleanError(e));
            }
        });
    }

    private JSONObject request(String method, String endpoint, JSONObject body, String bearer) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod(method); connection.setConnectTimeout(15000); connection.setReadTimeout(20000);
        connection.setRequestProperty("Accept", "application/json");
        if (bearer != null) connection.setRequestProperty("Authorization", "Bearer " + bearer);
        if (body != null) {
            connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "application/json");
            try (OutputStream out = connection.getOutputStream()) { out.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
        }
        int code = connection.getResponseCode();
        InputStream stream = code >= 400 ? connection.getErrorStream() : connection.getInputStream();
        String raw = readAll(stream);
        connection.disconnect();
        if (raw.isEmpty()) throw new Exception("Bridge API returned an empty response (HTTP " + code + ").");
        String trimmed = raw.trim();
        if (!trimmed.startsWith("{")) {
            String hint = trimmed.toLowerCase(Locale.ENGLISH).contains("<!doctype html")
                    ? "Bridge API URL returned the billing web page, not JSON. Configure the deployed /api/bridge/* backend URL."
                    : "Bridge API returned a non-JSON response (HTTP " + code + ").";
            throw new Exception(hint);
        }
        JSONObject json = new JSONObject(trimmed);
        if (code >= 400) throw new Exception(json.optString("error", "Server returned " + code));
        return json;
    }

    private void reportResult(String baseUrl, String token, String billId, String shopId, String jobId, String result, String error) {
        try {
            JSONObject body = new JSONObject().put("billId", billId).put("shopId", shopId).put("jobId", jobId)
                    .put("status", result).put("errorCode", error).put("printedAt", new Date().toInstant().toString());
            request("POST", baseUrl + "/api/bridge/print-result", body, token);
        } catch (Exception ignored) {}
    }

    private void postStatus(boolean connected) {
        String base = prefs.getString("baseUrl", ""), token = prefs.getString("accessToken", "");
        if (base.isEmpty() || token.isEmpty()) return;
        try {
            JSONObject body = new JSONObject().put("bridgeDeviceId", prefs.getString("bridgeDeviceId", ""))
                    .put("printerConfigured", !prefs.getString("printerMac", "").isEmpty()).put("printerConnected", connected)
                    .put("printerName", prefs.getString("printerName", "")).put("paperWidth", "80mm").put("appVersion", VERSION);
            request("POST", base + "/api/bridge/status", body, token);
        } catch (Exception ignored) {}
    }

    private void printBytes(BluetoothDevice device, byte[] bytes) throws Exception {
        BluetoothSocket socket = null;
        try {
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            socket.connect();
            OutputStream out = socket.getOutputStream();
            out.write(bytes); out.flush();
            Thread.sleep(350);
        } finally { if (socket != null) try { socket.close(); } catch (Exception ignored) {} }
    }

    private byte[] testReceipt() {
        String now = new SimpleDateFormat("dd-MM-yyyy hh:mm a", Locale.ENGLISH).format(new Date());
        String body = center("COFFEE CORNER PRINT CONNECTOR", 48) + "\n" + line() + "\n"
                + "Printer connected successfully\nPaper: 80mm / 3 inch\nDate: " + now + "\n"
                + line() + "\n" + center("TEST SUCCESS", 48) + "\n\n\n";
        return escpos(body);
    }

    private byte[] receiptBytes(JSONObject r) throws Exception {
        StringBuilder s = new StringBuilder();
        s.append(center(r.optString("shopName", "COFFEE CORNER").toUpperCase(Locale.ENGLISH), 48)).append('\n');
        if (!r.optString("address").isEmpty()) s.append(center(r.optString("address"), 48)).append('\n');
        if (!r.optString("phone").isEmpty()) s.append(center("Phone: " + r.optString("phone"), 48)).append('\n');
        if (!r.optString("email").isEmpty()) s.append(center(r.optString("email"), 48)).append('\n');
        s.append(line()).append('\n');
        s.append("Bill: ").append(r.optString("billNumber")).append('\n');
        if (!r.optString("customerName").isEmpty()) s.append("Customer: ").append(r.optString("customerName")).append('\n');
        if (!r.optString("customerPhone").isEmpty()) s.append("Phone: ").append(r.optString("customerPhone")).append('\n');
        String created = formatReceiptDate(r.optString("createdAt"));
        if (!created.isEmpty()) s.append("Date: ").append(created).append('\n');
        s.append(line()).append('\n');
        s.append(pad("ITEM", 27)).append(padLeft("QTY", 4)).append(padLeft("RATE", 8)).append(padLeft("AMOUNT", 9)).append('\n');
        s.append(line()).append('\n');
        JSONArray items = r.optJSONArray("items");
        if (items != null) for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.getJSONObject(i);
            List<String> names = wrap(item.optString("name"), 27);
            s.append(pad(names.get(0), 27)).append(padLeft(String.valueOf(item.optInt("quantity")), 4))
                    .append(padLeft(money(item.optDouble("price")), 8)).append(padLeft(money(item.optDouble("amount")), 9)).append('\n');
            for (int n = 1; n < names.size(); n++) s.append(names.get(n)).append('\n');
        }
        s.append(line()).append('\n');
        if (r.optDouble("discount", 0) > 0) s.append(padLeft("DISCOUNT  Rs." + money(r.optDouble("discount")), 48)).append('\n');
        s.append(padLeft("TOTAL  Rs." + money(r.optDouble("total")), 48)).append('\n');
        s.append("Payment: ").append(r.optString("paymentMethod", "cash").toUpperCase(Locale.ENGLISH)).append('\n');
        s.append(line()).append('\n');
        s.append(center(r.optString("footer", "Thank you - Visit again"), 48)).append("\n\n\n");
        return escpos(s.toString());
    }

    private String formatReceiptDate(String value) {
        if (value == null || value.trim().isEmpty()) return "";
        String[] patterns = {
                "yyyy-MM-dd'T'HH:mm:ss.SSSX",
                "yyyy-MM-dd'T'HH:mm:ssX",
                "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                "yyyy-MM-dd'T'HH:mm:ssXXX"
        };
        for (String pattern : patterns) {
            try {
                SimpleDateFormat input = new SimpleDateFormat(pattern, Locale.ENGLISH);
                input.setLenient(false);
                Date parsed = input.parse(value);
                if (parsed != null) {
                    SimpleDateFormat output = new SimpleDateFormat("dd-MM-yyyy hh:mm a", Locale.ENGLISH);
                    output.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
                    return output.format(parsed);
                }
            } catch (Exception ignored) {}
        }
        return value;
    }

    private byte[] escpos(String text) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0x1b); out.write(0x40);
        byte[] data = text.getBytes(StandardCharsets.UTF_8);
        out.write(data, 0, data.length);
        out.write(0x1d); out.write(0x56); out.write(0x42); out.write(0x00);
        return out.toByteArray();
    }

    private String line() { return "------------------------------------------------"; }
    private String center(String value, int width) { value = value.length() > width ? value.substring(0, width) : value; return " ".repeat(Math.max(0, (width - value.length()) / 2)) + value; }
    private String pad(String v, int width) { if (v.length() > width) return v.substring(0, width); return v + " ".repeat(width - v.length()); }
    private String padLeft(String v, int width) { if (v.length() > width) return v.substring(0, width); return " ".repeat(width - v.length()) + v; }
    private String money(double v) { return String.format(Locale.ENGLISH, "%.2f", v); }
    private List<String> wrap(String value, int width) {
        List<String> lines = new ArrayList<>(); String rest = value == null ? "" : value.trim();
        while (rest.length() > width) { int at = rest.lastIndexOf(' ', width); if (at < 1) at = width; lines.add(rest.substring(0, at)); rest = rest.substring(at).trim(); }
        lines.add(rest); return lines;
    }

    private String readAll(InputStream in) throws Exception {
        if (in == null) return "";
        ByteArrayOutputStream out = new ByteArrayOutputStream(); byte[] b = new byte[4096]; int n;
        while ((n = in.read(b)) != -1) out.write(b, 0, n);
        return out.toString(StandardCharsets.UTF_8.name());
    }
    private String enc(String value) { return Uri.encode(value); }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private String cleanError(Exception e) { return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage(); }
    private void setBusy(String message) { runOnUiThread(() -> { status.setText(message); saveButton.setEnabled(false); }); }
    private void setIdle() { saveButton.setEnabled(true); }
    private void setStatus(String message, boolean error) { status.setText(message); status.setTextColor(error ? Color.rgb(180, 35, 35) : Color.rgb(47, 125, 82)); }
    private void showError(String message) { runOnUiThread(() -> { setIdle(); setStatus(message, true); Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }); }
    private void returnTo(String url) {
        if (url == null || !url.startsWith("https://")) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {}
    }
}
