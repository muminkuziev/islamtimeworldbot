package com.islamtimeworld.app;

import android.os.Bundle;
import android.os.Build;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.graphics.Color;
import android.view.View;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private String lastSafeArea;
    private boolean darkSystemAppearance;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(CompassPlugin.class);
        registerPlugin(SystemAppearancePlugin.class);
        super.onCreate(savedInstanceState);
        // capacitor.config.json's webContentsDebuggingEnabled is shared by every
        // build type, so it can't itself turn debugging off for release. Force
        // it explicitly here instead: on for debug builds, off for release —
        // this is Android's own recommended pattern for this exact setting.
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        createNotificationChannels();
        setupWindowInsets();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        AudioAttributes audio = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        NotificationChannel silent = new NotificationChannel("itw_silent", "IslamTimeWorld — Ovozsiz", NotificationManager.IMPORTANCE_HIGH);
        silent.setDescription("Namoz eslatmalari — ovozsiz va vibratsiyasiz");
        silent.setSound(null, null);
        silent.enableVibration(false);

        NotificationChannel sound = new NotificationChannel("itw_sound", "IslamTimeWorld — Oddiy ovoz", NotificationManager.IMPORTANCE_HIGH);
        sound.setDescription("Namoz eslatmalari — standart notification ovozi");
        sound.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), audio);
        sound.enableVibration(false);

        NotificationChannel vibrate = new NotificationChannel("itw_vibrate", "IslamTimeWorld — Vibratsiya", NotificationManager.IMPORTANCE_HIGH);
        vibrate.setDescription("Namoz eslatmalari — faqat vibratsiya");
        vibrate.setSound(null, null);
        vibrate.enableVibration(true);
        vibrate.setVibrationPattern(new long[]{0, 350, 180, 350});

        Uri adhanUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.adhan);
        NotificationChannel adhan = new NotificationChannel("itw_adhan_v2", "IslamTimeWorld — Azon", NotificationManager.IMPORTANCE_HIGH);
        adhan.setDescription("Namoz eslatmalari — Azon ovozi");
        adhan.setSound(adhanUri, audio);
        adhan.enableVibration(false);

        nm.createNotificationChannel(silent);
        nm.createNotificationChannel(sound);
        nm.createNotificationChannel(vibrate);
        nm.createNotificationChannel(adhan);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Splash removal, keyboard dismissal and activity return may restore
        // the launch window's appearance after the WebView's first theme call.
        if (hasFocus) getWindow().getDecorView().post(this::applySystemAppearance);
    }

    public void setSystemAppearance(boolean dark) {
        darkSystemAppearance = dark;
        applySystemAppearance();
    }

    private void applySystemAppearance() {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(!darkSystemAppearance);
        controller.setAppearanceLightNavigationBars(!darkSystemAppearance);
        getWindow().setNavigationBarColor(Color.parseColor(darkSystemAppearance ? "#091714" : "#FFFFFF"));
    }

    // CSS reserves only the system UI that actually overlaps this WebView.
    // Older Android versions may already place the view above navigation bars;
    // adding their full height again creates the raised bottom menu.
    private void setupWindowInsets() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        View decor = getWindow().getDecorView();
        WebView webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            // A listener replaces View.onApplyWindowInsets; keep the decor's
            // default fitting/dispatch before observing its resulting bounds.
            WindowInsetsCompat applied = ViewCompat.onApplyWindowInsets(v, insets);
            webView.post(this::updateSafeArea);
            return applied;
        });
        View.OnLayoutChangeListener changed = (v, l, t, r, b, ol, ot, or, ob) ->
            webView.post(this::updateSafeArea);
        webView.addOnLayoutChangeListener(changed);
        decor.addOnLayoutChangeListener(changed);
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView view) {
                // A page reload replaces the document and its inline variables.
                lastSafeArea = null;
                view.post(MainActivity.this::updateSafeArea);
                ViewCompat.requestApplyInsets(decor);
            }
        });
        ViewCompat.requestApplyInsets(decor);
        webView.post(this::updateSafeArea);
    }

    private void updateSafeArea() {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        View decor = getWindow().getDecorView();
        if (webView == null || webView.getWidth() == 0 || webView.getHeight() == 0) return;
        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decor);
        if (insets == null) return;
        Insets bars = insets.getInsets(
            WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        int[] windowPosition = new int[2];
        int[] webPosition = new int[2];
        decor.getLocationOnScreen(windowPosition);
        webView.getLocationOnScreen(webPosition);
        float density = getResources().getDisplayMetrics().density;
        int top = cssOverlap(windowPosition[1] + bars.top - webPosition[1], density);
        int left = cssOverlap(windowPosition[0] + bars.left - webPosition[0], density);
        int bottom = cssOverlap(webPosition[1] + webView.getHeight() -
            (windowPosition[1] + decor.getHeight() - bars.bottom), density);
        int right = cssOverlap(webPosition[0] + webView.getWidth() -
            (windowPosition[0] + decor.getWidth() - bars.right), density);
        String values = top + "," + right + "," + bottom + "," + left;
        if (values.equals(lastSafeArea)) return;
        lastSafeArea = values;
        webView.evaluateJavascript(
            "(function(){var d=document.documentElement;if(!d)return;d=d.style;" +
            "d.setProperty('--sat','" + top + "px');" +
            "d.setProperty('--sab','" + bottom + "px');" +
            "d.setProperty('--sal','" + left + "px');" +
            "d.setProperty('--sar','" + right + "px');})()", null);
    }

    private static int cssOverlap(int physicalPixels, float density) {
        return (int) Math.ceil(Math.max(0, physicalPixels) / density);
    }
}
