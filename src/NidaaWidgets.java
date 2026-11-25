package dj.nidaa.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.SweepGradient;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Widgets Nidaa : Bande (4x1), Anneau (2x2), Sans fond (4x2), Arc solaire (4x2), Liste (2x2).
 * Les horaires sont envoyés par l'application (plugin NidaaWidget) et gardés dans les préférences :
 * les widgets fonctionnent ensuite seuls, même sans ouvrir l'application, pendant ~8 jours.
 */
public class NidaaWidgets {
    static final String PREFS = "nidaa_widget", KEY = "data", TICK = "dj.nidaa.app.WIDGET_TICK";
    static final int K_BAND = 0, K_RING = 1, K_CLEAR = 2, K_ARC = 3, K_LIST = 4;
    static final String[] KEYS = {"fajr", "shuruq", "dhuhr", "asr", "maghrib", "isha"};
    static final String[] FR = {"Fajr", "Shuruq", "Dhuhr", "Asr", "Maghrib", "Isha"};
    static final String[] AR = {"الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء"};
    static final int[] PRAYERS = {0, 2, 3, 4, 5};
    static final String[] JOURS = {"Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."};
    static final String[] MOIS = {"janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."};

    // couleurs
    static final int GOLD = 0xFFF3CF7A, GOLD_D = 0xFF9A7A2F, TXT = 0xFFF5F3EE, MUT = 0x99EBEEFA, GREEN = 0xFF76E2BE, BLUE = 0xFF8FB4FF, INK = 0xFF1D1D1F, INK_M = 0xFF6E6E73;

    // ---------------- fournisseurs ----------------
    public static class Band extends Base { int kind() { return K_BAND; } }
    public static class Ring extends Base { int kind() { return K_RING; } }
    public static class Clear extends Base { int kind() { return K_CLEAR; } }
    public static class Arc extends Base { int kind() { return K_ARC; } }
    public static class Day extends Base { int kind() { return K_LIST; } }

    static final Class<?>[] ALL = {Band.class, Ring.class, Clear.class, Arc.class, Day.class};

    public abstract static class Base extends AppWidgetProvider {
        abstract int kind();

        @Override
        public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
            for (int id : ids) draw(c, m, id, kind());
            schedule(c);
        }

        @Override
        public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) {
            draw(c, m, id, kind());
        }

        @Override
        public void onReceive(Context c, Intent i) {
            super.onReceive(c, i);
            String a = i.getAction();
            if (TICK.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a) || Intent.ACTION_DATE_CHANGED.equals(a)) refreshAll(c);
        }

        @Override
        public void onDisabled(Context c) { schedule(c); }
    }

    /** Redessine tous les widgets posés (appelé par l'application et chaque minute). */
    public static void refreshAll(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            for (int k = 0; k < ALL.length; k++) {
                int[] ids = m.getAppWidgetIds(new ComponentName(c, ALL[k]));
                for (int id : ids) draw(c, m, id, k);
            }
        } catch (Exception ignored) { }
        schedule(c);
    }

    static boolean any(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (Class<?> k : ALL) if (m.getAppWidgetIds(new ComponentName(c, k)).length > 0) return true;
        return false;
    }

    /** Rafraîchissement toutes les minutes (alarme non réveillante : rien ne tourne écran éteint). */
    static void schedule(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            Intent i = new Intent(c, Band.class).setAction(TICK);
            PendingIntent pi = PendingIntent.getBroadcast(c, 4242, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (!any(c)) { am.cancel(pi); return; }
            long now = System.currentTimeMillis(), next = (now / 60000L + 1) * 60000L + 500;
            am.set(AlarmManager.RTC, next, pi);
        } catch (Exception ignored) { }
    }

    // ---------------- données ----------------
    static class DayData { String date; String[] t = new String[6]; String[] iq = new String[6]; boolean fri, ram; int hd, hy; String hAr, imsak, tw; }
    static class Data { String name = "", nameAr = ""; TimeZone tz = TimeZone.getDefault(); ArrayList<DayData> days = new ArrayList<>(); }

    static Data load(Context c) {
        try {
            String s = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            if (s == null) return null;
            JSONObject o = new JSONObject(s);
            Data d = new Data();
            d.name = o.optString("name", "");
            d.nameAr = o.optString("nameAr", "");
            d.tz = TimeZone.getTimeZone(o.optString("tz", "Africa/Djibouti"));
            JSONArray a = o.getJSONArray("days");
            for (int i = 0; i < a.length(); i++) {
                JSONObject x = a.getJSONObject(i);
                DayData y = new DayData();
                y.date = x.getString("date");
                JSONObject t = x.getJSONObject("t"), q = x.optJSONObject("iq");
                for (int k = 0; k < 6; k++) { y.t[k] = t.optString(KEYS[k], "00:00"); y.iq[k] = q != null ? q.optString(KEYS[k], y.t[k]) : y.t[k]; }
                y.fri = x.optBoolean("fri", false);
                y.ram = x.optBoolean("ram", false);
                y.hd = x.optInt("hd", 0);
                y.hy = x.optInt("hy", 0);
                y.hAr = x.optString("hAr", "");
                y.imsak = x.optString("imsak", y.t[0]);
                y.tw = x.isNull("tw") ? null : x.optString("tw", null);
                d.days.add(y);
            }
            return d;
        } catch (Exception e) { return null; }
    }

    static void save(Context c, String json) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        p.edit().putString(KEY, json).apply();
    }

    static long at(String date, String hm, TimeZone tz) {
        try {
            SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US);
            f.setTimeZone(tz);
            return f.parse(date + " " + hm).getTime();
        } catch (Exception e) { return 0; }
    }

    static String ymd(long ms, TimeZone tz) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setTimeZone(tz);
        return f.format(new java.util.Date(ms));
    }

    /** État du moment : prochaine prière, phase iqama, Ramadan. */
    static class St {
        Data d; DayData day, prevDay, nextDay; int next = -1; boolean iq; long target, from;
        DayData nDay; // jour de la prochaine prière
        boolean ram; int rPhase; long imsakT, iftarT, rTarget; String rImsak;
    }

    static St state(Data d, long now) {
        if (d == null) return null;
        String today = ymd(now, d.tz);
        int idx = -1;
        for (int i = 0; i < d.days.size(); i++) if (d.days.get(i).date.equals(today)) { idx = i; break; }
        if (idx < 0) return null;
        St s = new St();
        s.d = d; s.day = d.days.get(idx);
        s.prevDay = idx > 0 ? d.days.get(idx - 1) : null;
        s.nextDay = idx + 1 < d.days.size() ? d.days.get(idx + 1) : null;
        outer:
        for (int j = 0; j < 2; j++) {
            DayData D = j == 0 ? s.day : s.nextDay;
            if (D == null) break;
            for (int k : PRAYERS) {
                long a = at(D.date, D.t[k], d.tz), q = at(D.date, D.iq[k], d.tz);
                if (now < a) { s.next = k; s.iq = false; s.target = a; s.nDay = D; break outer; }
                if (now < q) { s.next = k; s.iq = true; s.target = q; s.from = a; s.nDay = D; break outer; }
            }
        }
        if (s.next < 0) return null;
        if (!s.iq) { // début de l'intervalle : prière précédente
            int pi = -1;
            for (int n = 0; n < PRAYERS.length; n++) if (PRAYERS[n] == s.next) pi = n;
            if (pi > 0) s.from = at(s.nDay.date, s.nDay.t[PRAYERS[pi - 1]], d.tz);
            else {
                DayData p = s.nDay == s.day ? s.prevDay : s.day;
                s.from = p != null ? at(p.date, p.t[5], d.tz) : s.target - 8 * 3600000L;
            }
        }
        s.ram = s.day.ram;
        if (s.ram) {
            s.imsakT = at(s.day.date, s.day.imsak, d.tz);
            s.iftarT = at(s.day.date, s.day.t[4], d.tz);
            if (now < s.imsakT) { s.rPhase = 0; s.rTarget = s.imsakT; s.rImsak = s.day.imsak; }
            else if (now < s.iftarT) { s.rPhase = 1; s.rTarget = s.iftarT; s.rImsak = s.day.imsak; }
            else { s.rPhase = 2; s.rImsak = s.nextDay != null ? s.nextDay.imsak : null; s.rTarget = s.nextDay != null ? at(s.nextDay.date, s.nextDay.imsak, d.tz) : 0; }
        }
        return s;
    }

    static String nameFr(St s, int k) { return k == 2 && s.nDay != null && s.nDay.fri ? "Jumu'a" : FR[k]; }
    static String nameAr(St s, int k) { return k == 2 && s.nDay != null && s.nDay.fri ? "الجمعة" : AR[k]; }

    static String dur(long ms) {
        long m = Math.max(0, (ms + 59999) / 60000);
        if (m < 60) return m + " min";
        return (m / 60) + " h " + String.format(Locale.US, "%02d", m % 60);
    }

    // ---------------- dessin ----------------
    static Typeface tf200, tf400, tf600, tfRq, tfSh;

    static void fonts(Context c) {
        if (tf200 != null) return;
        try {
            tf200 = Typeface.createFromAsset(c.getAssets(), "fonts/w_font_outfit200.ttf");
            tf400 = Typeface.createFromAsset(c.getAssets(), "fonts/w_font_outfit400.ttf");
            tf600 = Typeface.createFromAsset(c.getAssets(), "fonts/w_font_outfit600.ttf");
            tfRq = Typeface.createFromAsset(c.getAssets(), "fonts/w_font_ruqaa.ttf");
            tfSh = Typeface.createFromAsset(c.getAssets(), "fonts/w_font_sh.ttf");
        } catch (Exception e) {
            tf200 = Typeface.create("sans-serif-light", Typeface.NORMAL);
            tf400 = Typeface.DEFAULT; tf600 = Typeface.DEFAULT_BOLD; tfRq = Typeface.SERIF; tfSh = Typeface.SERIF;
        }
    }

    /** Toile aux dimensions du widget (en dp), avec un facteur d'échelle pour la netteté. */
    static class G {
        Bitmap bmp; Canvas cv; float u, w, h; // u = pixels par dp ; w, h en dp
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        G(float wDp, float hDp, float density) {
            w = wDp; h = hDp;
            u = Math.min(density, 2.75f);
            while (w * u * h * u > 1400000f && u > 1f) u -= 0.25f;
            bmp = Bitmap.createBitmap(Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u)), Bitmap.Config.ARGB_8888);
            cv = new Canvas(bmp);
        }
        float x(float dp) { return dp * u; }
        /** Écrit du texte ; align : 0 gauche, 1 centre, 2 droite. Renvoie la largeur en dp. */
        float text(String s, float xDp, float yDp, float size, Typeface t, int color, int align) { return text(s, xDp, yDp, size, t, color, align, 0f, false); }
        float text(String s, float xDp, float yDp, float size, Typeface t, int color, int align, float spacing, boolean shadow) {
            if (s == null) return 0;
            p.reset(); p.setAntiAlias(true); p.setSubpixelText(true);
            p.setTypeface(t); p.setTextSize(size * u); p.setColor(color);
            if (Build.VERSION.SDK_INT >= 21 && spacing != 0) p.setLetterSpacing(spacing);
            p.setTextAlign(align == 1 ? Paint.Align.CENTER : align == 2 ? Paint.Align.RIGHT : Paint.Align.LEFT);
            if (shadow) p.setShadowLayer(6 * u, 0, 1.5f * u, 0x8C000000);
            cv.drawText(s, xDp * u, yDp * u, p);
            return p.measureText(s) / u;
        }
        float measure(String s, float size, Typeface t) { p.reset(); p.setTypeface(t); p.setTextSize(size * u); return p.measureText(s) / u; }
        void card(boolean light, int border) {
            p.reset(); p.setAntiAlias(true);
            RectF r = new RectF(0, 0, w * u, h * u);
            float rad = Math.min(26, h / 2) * u;
            p.setShader(light
                    ? new LinearGradient(0, 0, w * u, h * u, 0xF2FFFFFF, 0xF2F5F0E4, Shader.TileMode.CLAMP)
                    : new LinearGradient(0, 0, w * u, h * u, 0xEB121C3E, 0xF0080C1E, Shader.TileMode.CLAMP));
            cv.drawRoundRect(r, rad, rad, p);
            p.setShader(null); p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(u); p.setColor(border);
            RectF r2 = new RectF(u / 2, u / 2, w * u - u / 2, h * u - u / 2);
            cv.drawRoundRect(r2, rad, rad, p);
        }
        void ring(float cx, float cy, float r, float sw, float frac, int c1, int c2, boolean grad) {
            p.reset(); p.setAntiAlias(true); p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(sw * u); p.setStrokeCap(Paint.Cap.ROUND);
            p.setColor(0x1AFFFFFF);
            RectF o = new RectF((cx - r) * u, (cy - r) * u, (cx + r) * u, (cy + r) * u);
            cv.drawOval(o, p);
            frac = Math.max(0.01f, Math.min(1f, frac));
            if (grad) {
                SweepGradient sg = new SweepGradient(cx * u, cy * u, new int[]{c1, c2, c2}, new float[]{0f, Math.max(0.02f, frac), 1f});
                Matrix m = new Matrix(); m.setRotate(-90, cx * u, cy * u); sg.setLocalMatrix(m);
                p.setShader(sg);
            } else p.setColor(c2);
            cv.drawArc(o, -90, 360 * frac, false, p);
            p.setShader(null);
        }
        void line(float x1, float y1, float x2, float y2, float sw, int color) {
            p.reset(); p.setAntiAlias(true); p.setStrokeWidth(sw * u); p.setColor(color); p.setStrokeCap(Paint.Cap.ROUND);
            cv.drawLine(x1 * u, y1 * u, x2 * u, y2 * u, p);
        }
        void dot(float x, float y, float r, int color) { p.reset(); p.setAntiAlias(true); p.setColor(color); cv.drawCircle(x * u, y * u, r * u, p); }
        void pill(float l, float t, float r, float b, float rad, int fill, int stroke) {
            p.reset(); p.setAntiAlias(true); p.setColor(fill);
            RectF o = new RectF(l * u, t * u, r * u, b * u);
            cv.drawRoundRect(o, rad * u, rad * u, p);
            if (stroke != 0) { p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(u); p.setColor(stroke); cv.drawRoundRect(o, rad * u, rad * u, p); }
        }
        void crescent(float x, float y, float r, int color) {
            p.reset(); p.setAntiAlias(true); p.setColor(color);
            Path a = new Path(); a.addCircle(x * u, y * u, r * u, Path.Direction.CW);
            Path b = new Path(); b.addCircle((x + r * 0.45f) * u, (y - r * 0.3f) * u, r * 0.85f * u, Path.Direction.CW);
            if (Build.VERSION.SDK_INT >= 19) { a.op(b, Path.Op.DIFFERENCE); cv.drawPath(a, p); } else cv.drawCircle(x * u, y * u, r * u, p);
        }
        void sun(float x, float y, int core) {
            p.reset(); p.setAntiAlias(true);
            p.setShader(new RadialGradient(x * u, y * u, 16 * u, new int[]{0xFFFFF3C8, 0xAAF3CF7A, 0x00F3CF7A}, new float[]{0f, 0.45f, 1f}, Shader.TileMode.CLAMP));
            cv.drawCircle(x * u, y * u, 16 * u, p);
            p.setShader(null); p.setColor(core); cv.drawCircle(x * u, y * u, 6 * u, p);
        }
    }

    static float[] sizeDp(AppWidgetManager m, int id, float dw, float dh) {
        try {
            Bundle o = m.getAppWidgetOptions(id);
            int w = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0), h = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
            if (w > 40 && h > 30) return new float[]{w, h};
        } catch (Exception ignored) { }
        return new float[]{dw, dh};
    }

    static boolean night(Context c) {
        return (c.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }

    static int res(Context c, String type, String name) { return c.getResources().getIdentifier(name, type, c.getPackageName()); }

    /** Dessine un widget. */
    static void draw(Context c, AppWidgetManager m, int id, int kind) {
        try {
            fonts(c);
            long now = System.currentTimeMillis();
            Data d = load(c);
            St s = state(d, now);
            float dens = c.getResources().getDisplayMetrics().density;
            String layout = kind == K_RING ? "w_ring" : kind == K_ARC ? (s != null && s.ram ? "w_arc_ram" : "w_arc") : "w_bmp";
            RemoteViews rv = new RemoteViews(c.getPackageName(), res(c, "layout", layout));
            int img = res(c, "id", "w_img"), cd = res(c, "id", "w_cd"), root = res(c, "id", "w_root");
            boolean chrono = Build.VERSION.SDK_INT >= 24 && s != null;
            G g;
            if (kind == K_BAND) { float[] z = sizeDp(m, id, 320, 72); g = new G(z[0], Math.min(z[1], 90), dens); band(g, s, now); }
            else if (kind == K_RING) { float[] z = sizeDp(m, id, 170, 170); float q = Math.min(z[0], z[1]); g = new G(q, q, dens); ring(g, s, now, chrono); }
            else if (kind == K_CLEAR) { float[] z = sizeDp(m, id, 330, 170); g = new G(z[0], z[1], dens); clear(g, s, now); }
            else if (kind == K_ARC) { float[] z = sizeDp(m, id, 330, 180); g = new G(z[0], z[1], dens); arc(g, s, now, chrono, !night(c) && !(s != null && s.ram)); }
            else { float[] z = sizeDp(m, id, 170, 170); g = new G(z[0], z[1], dens); list(g, s, now); }
            rv.setImageViewBitmap(img, g.bmp);
            if (cd != 0 && (kind == K_RING || kind == K_ARC)) {
                long tg = s == null ? 0 : (s.ram && (kind == K_ARC || kind == K_RING)) ? s.rTarget : s.target;
                if (chrono && tg > now) {
                    rv.setViewVisibility(cd, View.VISIBLE);
                    rv.setChronometer(cd, SystemClock.elapsedRealtime() + (tg - now), null, true);
                    if (Build.VERSION.SDK_INT >= 24) rv.setChronometerCountDown(cd, true);
                    if (kind == K_ARC) rv.setTextColor(cd, (!night(c) && !s.ram) ? GOLD_D : GOLD);
                    if (kind == K_RING) rv.setTextColor(cd, TXT);
                } else rv.setViewVisibility(cd, View.GONE);
            }
            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            if (open != null && root != 0) rv.setOnClickPendingIntent(root, PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            m.updateAppWidget(id, rv);
        } catch (Exception ignored) { }
    }

    static void empty(G g, boolean card) {
        if (card) g.card(false, 0x1FFFFFFF);
        g.text("Nidaa", g.w / 2, g.h / 2 - 6, 15, tf600, GOLD, 1, 0, !card);
        g.text("Ouvrez l'application", g.w / 2, g.h / 2 + 12, 11.5f, tf400, card ? MUT : TXT, 1, 0, !card);
    }

    // ---------- Bande 4x1 ----------
    static void band(G g, St s, long now) {
        if (s == null) { empty(g, true); return; }
        g.card(false, s.iq ? 0x5976E2BE : 0x1FFFFFFF);
        float cy = g.h / 2;
        boolean r1 = s.ram && s.rPhase == 1;
        float frac = r1 ? (float) (now - s.imsakT) / Math.max(1, s.iftarT - s.imsakT) : (float) (now - s.from) / Math.max(1, s.target - s.from);
        g.ring(30, cy, 13, 3.2f, frac, BLUE, s.iq ? GREEN : GOLD, !s.iq);
        String t1 = r1 ? "Iftar" : nameFr(s, s.next), t1a = r1 ? "الإفطار" : nameAr(s, s.next);
        float w1 = g.text(t1, 54, cy - 2, 15, tf400, TXT, 0);
        g.text(t1a, 54 + w1 + 6, cy - 2, 16, tfSh, GOLD, 0);
        String sub = r1 ? s.d.name + " · imsak " + s.day.imsak : s.iq ? s.d.name + " · adhan " + s.nDay.t[s.next] : s.d.name + " · iqama " + s.nDay.iq[s.next];
        g.text(ell(g, sub, g.w - 54 - 100, 11.5f), 54, cy + 15, 11.5f, tf400, MUT, 0);
        long tg = r1 ? s.iftarT : s.target;
        String d = dur(tg - now), big = d.replace(" min", ""), small = d.endsWith("min") ? " min" : "";
        float ws = small.isEmpty() ? 0 : g.measure(small, 12, tf400);
        g.text(big, g.w - 16 - ws, cy + 4, 24, tf200, TXT, 2);
        if (ws > 0) g.text(small, g.w - 16, cy + 4, 12, tf400, MUT, 2);
        g.text((s.iq ? "iqama " : "à ") + hm(tg, s.d.tz), g.w - 16, cy + 19, 11, tf400, s.iq ? GREEN : MUT, 2);
    }

    static String ell(G g, String s, float maxDp, float size) {
        if (g.measure(s, size, tf400) <= maxDp) return s;
        while (s.length() > 3 && g.measure(s + "…", size, tf400) > maxDp) s = s.substring(0, s.length() - 1);
        return s + "…";
    }

    static String hm(long ms, TimeZone tz) { SimpleDateFormat f = new SimpleDateFormat("HH:mm", Locale.US); f.setTimeZone(tz); return f.format(new java.util.Date(ms)); }

    // ---------- Anneau 2x2 ----------
    static void ring(G g, St s, long now, boolean chrono) {
        if (s == null) { empty(g, true); return; }
        boolean ram = s.ram;
        g.card(false, s.iq && !ram ? 0x5976E2BE : 0x1FFFFFFF);
        float cx = g.w / 2, cy = g.h / 2, r = g.w / 2 - 14;
        float frac; int col; boolean grad = true;
        String name, sub, lab = null;
        if (ram) {
            frac = s.rPhase == 1 ? (float) (now - s.imsakT) / Math.max(1, s.iftarT - s.imsakT) : 0.02f;
            col = GOLD; name = s.rPhase == 1 ? "الإفطار" : "الإمساك";
            sub = s.rPhase == 1 ? Math.round(frac * 100) + " % du jeûne" : "imsak " + (s.rImsak != null ? s.rImsak : "");
        } else if (s.iq) {
            frac = (float) (now - s.from) / Math.max(1, s.target - s.from); col = GREEN; grad = false;
            name = nameAr(s, s.next); sub = "à " + s.nDay.iq[s.next]; lab = "IQAMA";
        } else {
            frac = (float) (now - s.from) / Math.max(1, s.target - s.from); col = GOLD;
            name = nameAr(s, s.next); sub = "adhan " + s.nDay.t[s.next];
        }
        g.ring(cx, cy, r, 6, frac, BLUE, col, grad);
        float k = g.w / 170f; // proportions
        if (lab != null) g.text(lab, cx, cy - 42 * k, 9.5f * k, tf600, GREEN, 1, 0.18f, false);
        g.text(name, cx, cy - 10 * k, (lab != null ? 25 : 29) * k, tfRq, GOLD, 1);
        if (!chrono) { long tg = ram ? s.rTarget : s.target; g.text(dur(tg - now), cx, cy + 26 * k, 20 * k, tf200, TXT, 1); }
        g.text(sub, cx, cy + 48 * k, 11 * k, tf400, MUT, 1);
    }

    // ---------- Sans fond ----------
    static void clear(G g, St s, long now) {
        if (s == null) { empty(g, false); return; }
        boolean r = s.ram;
        String k, big, line, ar; long tg;
        if (r && s.rPhase == 1) { k = "IFTAR"; big = s.day.t[4]; tg = s.iftarT; ar = "الإفطار"; line = "dans " + dur(tg - now) + " · imsak " + s.day.imsak; }
        else if (r) { k = "IMSAK"; big = s.rImsak != null ? s.rImsak : "--:--"; tg = s.rTarget; ar = "الإمساك"; line = (tg > now ? "dans " + dur(tg - now) + " · " : "") + "fin du suhoor"; }
        else { k = s.iq ? "IQAMA" : "PROCHAINE PRIÈRE"; tg = s.target; big = s.iq ? s.nDay.iq[s.next] : s.nDay.t[s.next]; ar = nameAr(s, s.next);
            line = nameFr(s, s.next) + " · dans " + dur(tg - now) + (s.iq ? "" : " · iqama " + s.nDay.iq[s.next]); }
        float top = Math.max(6, (g.h - 140) / 2);
        g.text(k, 4, top + 14, 11, tf600, s.iq && !r ? GREEN : TXT, 0, 0.16f, true);
        g.text(big, 2, top + 66, 54, tf200, TXT, 0, 0, true);
        g.text(line, 4, top + 88, 13, tf400, TXT, 0, 0, true);
        g.text(ar, g.w - 4, top + 66, 46, tfRq, 0xFFFFE2A0, 2, 0, true);
        // ligne des prières
        float y = top + 116, x0 = 4, x1 = g.w - 4, step = (x1 - x0) / 5f;
        for (int n = 0; n < 5; n++) {
            int pk = PRAYERS[n];
            boolean cur = !r && s.nDay == s.day && pk == s.next, past = !cur && at(s.day.date, s.day.t[pk], s.d.tz) < now;
            String lbl = (pk == 2 && s.day.fri ? "Jumu'a" : FR[pk]) + " " + s.day.t[pk];
            g.text(lbl, x0 + step * n + step / 2, y, 11.5f, cur ? tf600 : tf400, cur ? 0xFFFFE2A0 : (past ? 0x80FFFFFF : TXT), 1, 0, true);
        }
        long f0 = at(s.day.date, s.day.t[0], s.d.tz), f1 = at(s.day.date, s.day.t[5], s.d.tz);
        float frac = Math.max(0f, Math.min(1f, (float) (now - f0) / Math.max(1L, f1 - f0)));
        g.line(x0, y + 8, x1, y + 8, 2, 0x40FFFFFF);
        if (frac > 0) g.line(x0, y + 8, x0 + (x1 - x0) * frac, y + 8, 2, 0xFFFFE2A0);
    }

    // ---------- Arc solaire ----------
    static float[] bez(float t, float x0, float x1, float yb, float yp) {
        float cx = (x0 + x1) / 2, cy = yp - (yb - yp) * 0.9f, a = 1 - t;
        return new float[]{a * a * x0 + 2 * a * t * cx + t * t * x1, a * a * yb + 2 * a * t * cy + t * t * yb};
    }

    static String dateLine(St s) {
        Calendar k = Calendar.getInstance(s.d.tz);
        k.setTimeInMillis(at(s.day.date, "12:00", s.d.tz));
        return JOURS[k.get(Calendar.DAY_OF_WEEK) - 1] + " " + k.get(Calendar.DAY_OF_MONTH) + " " + MOIS[k.get(Calendar.MONTH)];
    }

    static String arDigits(String v) {
        StringBuilder b = new StringBuilder();
        for (char ch : v.toCharArray()) b.append(ch >= '0' && ch <= '9' ? (char) ('٠' + (ch - '0')) : ch);
        return b.toString();
    }

    static void arc(G g, St s, long now, boolean chrono, boolean light) {
        if (s == null) { empty(g, true); return; }
        boolean r = s.ram;
        g.card(light, light ? 0x99FFFFFF : 0x1FFFFFFF);
        int tx = light ? INK : TXT, mu = light ? INK_M : MUT, gd = light ? GOLD_D : GOLD;
        // en-tête
        if (r) {
            g.text("Ramadan · Jour " + s.day.hd, 16, 24, 14, tf600, GOLD, 0);
            g.text(ell(g, s.d.name, g.w * 0.5f, 12), 16, 40, 12, tf400, MUT, 0);
        } else {
            g.text(ell(g, s.d.name, g.w * 0.55f, 14), 16, 24, 14, tf400, tx, 0);
            float wd = g.text(dateLine(s) + " · ", 16, 40, 12, tf400, mu, 0);
            g.text(arDigits(s.day.hd + " " + s.day.hAr), 16 + wd, 40, 13, tfSh, mu, 0);
            g.text((s.iq ? "IQAMA DANS" : (nameFr(s, s.next) + " dans").toUpperCase(Locale.FRENCH)), g.w - 16, 20, 10, tf600, s.iq ? GREEN : mu, 2, 0.16f, false);
            if (!chrono) g.text(dur(s.target - now), g.w - 16, 46, 22, tf200, gd, 2);
        }
        // arc
        float rowH = r ? 40 : 36, x0 = 22, x1 = g.w - 22, yb = g.h - rowH - 10, yp = Math.max(54, yb - Math.max(20, (yb - 54)));
        if (yb - yp < 18) yp = yb - 18;
        long tA, tB, tN = now;
        if (r) { tA = s.imsakT; tB = s.iftarT; } else { tA = at(s.day.date, s.day.t[0], s.d.tz); tB = at(s.day.date, s.day.t[5], s.d.tz); }
        float fr = (float) (tN - tA) / Math.max(1, tB - tA), fc = Math.max(0, Math.min(1, fr));
        Paint p = g.p;
        // trajectoire pointillée
        p.reset(); p.setAntiAlias(true); p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(2.2f * g.u); p.setColor(light ? 0x33000000 : 0x26FFFFFF);
        p.setPathEffect(new DashPathEffect(new float[]{2 * g.u, 5 * g.u}, 0));
        Path full = new Path();
        for (int i = 0; i <= 60; i++) { float[] q = bez(i / 60f, x0, x1, yb, yp); if (i == 0) full.moveTo(q[0] * g.u, q[1] * g.u); else full.lineTo(q[0] * g.u, q[1] * g.u); }
        g.cv.drawPath(full, p);
        p.setPathEffect(null);
        g.line(x0 - 8, yb, x1 + 8, yb, 1, light ? 0x1F000000 : 0x24FFFFFF);
        // partie parcourue
        if (fc > 0.005f) {
            Path done = new Path();
            int n = Math.max(2, Math.round(60 * fc));
            for (int i = 0; i <= n; i++) { float[] q = bez(fc * i / n, x0, x1, yb, yp); if (i == 0) done.moveTo(q[0] * g.u, q[1] * g.u); else done.lineTo(q[0] * g.u, q[1] * g.u); }
            p.reset(); p.setAntiAlias(true); p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(3.2f * g.u); p.setStrokeCap(Paint.Cap.ROUND);
            p.setShader(new LinearGradient(x0 * g.u, 0, x1 * g.u, 0, new int[]{BLUE, GOLD, 0xFFE88A6A}, null, Shader.TileMode.CLAMP));
            g.cv.drawPath(done, p); p.setShader(null);
        }
        if (r) {
            g.dot(x0, yb, 4, BLUE); g.dot(x1, yb, 4, GOLD);
            float[] q = bez(fc, x0, x1, yb, yp);
            g.dot(q[0], q[1], 13, 0x2EF3CF7A); g.crescent(q[0], q[1], 8, GOLD);
            g.text("IMSAK", 16, g.h - 30, 9.5f, tf600, MUT, 0, 0.14f, false);
            g.text(s.day.imsak, 16, g.h - 13, 17, tf400, TXT, 0);
            g.text("IFTAR", g.w - 16, g.h - 30, 9.5f, tf600, MUT, 2, 0.14f, false);
            g.text(s.day.t[4], g.w - 16, g.h - 13, 17, tf400, GOLD, 2);
            String lb = s.rPhase == 1 ? "IFTAR DANS" : "IMSAK DANS";
            g.text(lb, g.w / 2, g.h - 46, 9.5f, tf600, MUT, 1, 0.14f, false);
            if (!chrono) g.text(dur(s.rTarget - now), g.w / 2, g.h - 14, 24, tf200, TXT, 1);
            return;
        }
        // points des prières + soleil / lune
        for (int k = 0; k < 6; k++) {
            long tk = at(s.day.date, s.day.t[k], s.d.tz);
            float fk = Math.max(0, Math.min(1, (float) (tk - tA) / Math.max(1, tB - tA)));
            float[] q = bez(fk, x0, x1, yb, yp);
            boolean cur = s.nDay == s.day && k == s.next;
            g.dot(q[0], q[1], cur ? 4.5f : 3.2f, cur ? gd : (tk < now ? (light ? 0x66000000 : 0x73FFFFFF) : (light ? 0x40000000 : 0x4DFFFFFF)));
        }
        float[] sp = bez(fc, x0, x1, yb, yp);
        if (fr > 0 && fr < 1) g.sun(sp[0], sp[1], light ? 0xFFFFF0C4 : 0xFFFFF6D6);
        else g.crescent(sp[0], sp[1] - 2, 7, light ? GOLD_D : GOLD);
        // rangée des horaires
        float rowY = g.h - rowH - 4, cw = (g.w - 20) / 6f;
        for (int k = 0; k < 6; k++) {
            boolean cur = s.nDay == s.day && k == s.next;
            boolean past = !cur && at(s.day.date, s.day.t[k], s.d.tz) < now && (s.nDay != s.day || k < s.next);
            float cx = 10 + cw * k + cw / 2;
            if (cur) g.pill(cx - cw / 2 + 2, rowY, cx + cw / 2 - 2, rowY + rowH, 11, light ? GOLD_D : 0x29F3CF7A, light ? 0 : 0x80F3CF7A);
            int col = cur ? (light ? 0xFFFFFFFF : GOLD) : (past ? (light ? 0x80000000 : 0x73FFFFFF) : tx);
            String an = k == 2 && s.day.fri ? "الجمعة" : AR[k];
            g.text(an, cx, rowY + 16, 12.5f, tfSh, col, 1);
            g.text(s.day.t[k], cx, rowY + 31, 13, cur ? tf600 : tf400, col, 1);
        }
    }

    // ---------- Liste 2x2 ----------
    static void list(G g, St s, long now) {
        if (s == null) { empty(g, true); return; }
        g.card(false, 0x1FFFFFFF);
        float y = 26, lh = Math.min(24, (g.h - 40) / (s.ram ? 4.6f : 6.2f));
        if (s.ram) {
            g.text("CE SOIR", 16, 22, 10, tf600, MUT, 0, 0.16f, false);
            DayData n = s.nextDay;
            String[][] rows = {{"Iftar", s.day.t[4]}, {"Isha", s.day.t[5]}, {"Tarawih", s.day.tw != null ? s.day.tw : "—"}, {"Imsak", s.rPhase == 0 ? s.day.imsak : (n != null ? n.imsak : "—")}};
            for (int i = 0; i < rows.length; i++) {
                float yy = 30 + lh * (i + 1);
                g.text(rows[i][0], 16, yy, 13, tf400, MUT, 0);
                g.text(rows[i][1], g.w - 16, yy, 15, tf400, i == 0 ? GOLD : TXT, 2);
            }
            return;
        }
        g.text("AUJOURD'HUI", 16, 22, 10, tf600, MUT, 0, 0.16f, false);
        for (int k = 0; k < 6; k++) {
            float yy = 28 + lh * (k + 1);
            boolean cur = s.nDay == s.day && k == s.next, past = !cur && at(s.day.date, s.day.t[k], s.d.tz) < now;
            int col = cur ? GOLD : (past ? 0x73FFFFFF : TXT);
            if (cur) g.pill(8, yy - lh + 5, g.w - 8, yy + 6, 9, 0x29F3CF7A, 0x66F3CF7A);
            g.text(k == 2 && s.day.fri ? "Jumu'a" : FR[k], 16, yy, 13, cur ? tf600 : tf400, col, 0);
            g.text(s.day.t[k], g.w - 16, yy, 14, cur ? tf600 : tf400, col, 2);
        }
    }
}
