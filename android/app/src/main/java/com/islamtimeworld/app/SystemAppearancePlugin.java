package com.islamtimeworld.app;

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
            ((MainActivity) getActivity()).setSystemAppearance(dark);
            call.resolve();
        });
    }
}
