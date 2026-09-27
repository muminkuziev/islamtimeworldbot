package com.islamtimeworld.app;

import android.graphics.Color;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Keep Android status/navigation controls legible against the app theme. */
@CapacitorPlugin(name = "SystemAppearance")
public class SystemAppearancePlugin extends Plugin {
    @PluginMethod
    public void setTheme(PluginCall call) {
        boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(!dark);
            controller.setAppearanceLightNavigationBars(!dark);
            // On enforced edge-to-edge versions the system may ignore bar
            // colors, while the icon-contrast flags still apply.
            window.setNavigationBarColor(Color.parseColor(dark ? "#091714" : "#FFFFFF"));
            call.resolve();
        });
    }
}
