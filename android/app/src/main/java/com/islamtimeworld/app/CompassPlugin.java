package com.islamtimeworld.app;

import android.content.Context;
import android.hardware.GeomagneticField;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.view.Surface;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Absolute compass readings for WebViews which do not dispatch orientation events. */
@CapacitorPlugin(name = "Compass")
public class CompassPlugin extends Plugin implements SensorEventListener {
    private SensorManager manager;
    private Sensor rotation;
    private Sensor accelerometer;
    private Sensor magnetometer;
    private boolean requested;
    private boolean listening;
    private boolean hasGravity;
    private boolean hasMagnetic;
    private boolean hasLocation;
    private float declination;
    private int accuracy = SensorManager.SENSOR_STATUS_UNRELIABLE;
    private long lastReading;
    private final float[] gravity = new float[3];
    private final float[] magnetic = new float[3];
    private final float[] matrix = new float[9];
    private final float[] remapped = new float[9];
    private final float[] orientation = new float[3];

    @Override
    public void load() {
        manager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        if (manager == null) return;
        // GAME_ROTATION_VECTOR deliberately excluded: its yaw has no north reference.
        rotation = manager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        if (rotation == null) rotation = manager.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR);
        accelerometer = manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        magnetometer = manager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
    }

    @PluginMethod
    public void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            updateLocation(call);
            requested = true;
            boolean available = startSensors();
            JSObject result = new JSObject();
            result.put("available", available);
            result.put("reference", hasLocation ? "true" : "magnetic");
            call.resolve(result);
        });
    }

    @PluginMethod
    public void setLocation(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            updateLocation(call);
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            requested = false;
            stopSensors();
            call.resolve();
        });
    }

    private void updateLocation(PluginCall call) {
        Double latitude = call.getDouble("latitude");
        Double longitude = call.getDouble("longitude");
        if (latitude == null || longitude == null || Double.isNaN(latitude) || Double.isInfinite(latitude)
            || Double.isNaN(longitude) || Double.isInfinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
        // Qibla bearings use geographic north; SensorManager reports magnetic north.
        // Coordinates are used only in memory, never logged or persisted by this plugin.
        declination = new GeomagneticField(latitude.floatValue(), longitude.floatValue(),
            0f, System.currentTimeMillis()).getDeclination();
        hasLocation = true;
    }

    private boolean startSensors() {
        if (listening) return true;
        if (manager == null) return false;
        hasGravity = false;
        hasMagnetic = false;
        lastReading = 0;
        accuracy = SensorManager.SENSOR_STATUS_UNRELIABLE;
        if (rotation != null) {
            listening = manager.registerListener(this, rotation, SensorManager.SENSOR_DELAY_UI);
        }
        if (!listening && accelerometer != null && magnetometer != null) {
            boolean accel = manager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_UI);
            boolean mag = manager.registerListener(this, magnetometer, SensorManager.SENSOR_DELAY_UI);
            listening = accel && mag;
            if (!listening) manager.unregisterListener(this);
        }
        return listening;
    }

    private void stopSensors() {
        if (manager != null) manager.unregisterListener(this);
        listening = false;
    }

    @Override
    protected void handleOnPause() {
        stopSensors();
    }

    @Override
    protected void handleOnResume() {
        if (requested) startSensors();
    }

    @Override
    protected void handleOnDestroy() {
        requested = false;
        stopSensors();
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int value) {
        if (sensor == rotation || sensor.getType() == Sensor.TYPE_MAGNETIC_FIELD) accuracy = value;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (!listening || !requested) return;
        int type = event.sensor.getType();
        boolean vector = type == Sensor.TYPE_ROTATION_VECTOR || type == Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR;
        if (vector) {
            SensorManager.getRotationMatrixFromVector(matrix, event.values);
            accuracy = event.accuracy;
        } else {
            if (type == Sensor.TYPE_ACCELEROMETER) {
                filter(event.values, gravity, hasGravity);
                hasGravity = true;
            } else if (type == Sensor.TYPE_MAGNETIC_FIELD) {
                filter(event.values, magnetic, hasMagnetic);
                hasMagnetic = true;
                accuracy = event.accuracy;
            } else return;
            if (!hasGravity || !hasMagnetic || !SensorManager.getRotationMatrix(matrix, null, gravity, magnetic)) return;
        }
        // Match the top of the displayed screen, including naturally-landscape tablets.
        int x = SensorManager.AXIS_X;
        int y = SensorManager.AXIS_Y;
        switch (getActivity().getWindowManager().getDefaultDisplay().getRotation()) {
            case Surface.ROTATION_90: x = SensorManager.AXIS_Y; y = SensorManager.AXIS_MINUS_X; break;
            case Surface.ROTATION_180: x = SensorManager.AXIS_MINUS_X; y = SensorManager.AXIS_MINUS_Y; break;
            case Surface.ROTATION_270: x = SensorManager.AXIS_MINUS_Y; y = SensorManager.AXIS_X; break;
            default: break;
        }
        if (!SensorManager.remapCoordinateSystem(matrix, x, y, remapped)) return;
        SensorManager.getOrientation(remapped, orientation);
        double magneticHeading = Math.toDegrees(orientation[0]);
        double heading = (magneticHeading + (hasLocation ? declination : 0) + 360) % 360;
        if (Double.isNaN(heading) || Double.isInfinite(heading)) return;
        // Bound bridge traffic to 20 Hz without requesting high-rate sensor permission.
        if (event.timestamp - lastReading < 50_000_000L) return;
        lastReading = event.timestamp;
        JSObject reading = new JSObject();
        reading.put("heading", heading);
        reading.put("absolute", true);
        reading.put("reference", hasLocation ? "true" : "magnetic");
        reading.put("calibrationRequired", accuracy <= SensorManager.SENSOR_STATUS_ACCURACY_LOW);
        reading.put("needsFlat", Math.abs(remapped[8]) < 0.5f);
        if (vector && event.values.length >= 5 && event.values[4] >= 0 && !Float.isInfinite(event.values[4])) {
            reading.put("accuracyDegrees", Math.toDegrees(event.values[4]));
        }
        notifyListeners("heading", reading);
    }

    private static void filter(float[] source, float[] target, boolean initialized) {
        for (int i = 0; i < 3; i++) target[i] = initialized ? target[i] + 0.25f * (source[i] - target[i]) : source[i];
    }
}
