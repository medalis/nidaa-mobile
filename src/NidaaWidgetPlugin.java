package dj.nidaa.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Reçoit les horaires de l'application et met à jour les widgets de l'écran d'accueil. */
@CapacitorPlugin(name = "NidaaWidget")
public class NidaaWidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        if (data == null) { call.reject("data manquant"); return; }
        NidaaWidgets.save(getContext(), data);
        NidaaWidgets.refreshAll(getContext());
        JSObject r = new JSObject();
        r.put("ok", true);
        call.resolve(r);
    }
}
