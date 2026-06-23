package expo.modules.notificationreader

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * Discovery-based capture. While monitoring is on, every app that posts a
 * notification is recorded (so the picker can show the real apps that notify
 * you). For the apps you then select, a payment amount is parsed, stored, and an
 * "add spending?" prompt is posted. Runs in the background once Notification
 * access is granted — independent of the JS runtime.
 */
class ReceiptNotificationListenerService : NotificationListenerService() {

  companion object {
    var emitter: ((Map<String, Any?>) -> Unit)? = null

    private val AMOUNT_RE = Regex(
      "(?:[$€£₹₩₺₪]|RON|USD|EUR|GBP|PLN|lei)?\\s?\\d{1,3}(?:[ .,]\\d{3})*[.,]\\d{2}",
      RegexOption.IGNORE_CASE
    )
    private const val CHANNEL_ID = "openbudget_digital_receipts"
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (!ReceiptStore.isEnabled(applicationContext)) return
    val pkg = sbn.packageName ?: return

    // 1) Discovery: remember every app we see, with its human-readable label.
    val label = appLabel(pkg)
    ReceiptStore.recordSeen(applicationContext, pkg, label)

    // 2) Capture: only for apps the user picked as receipt sources.
    if (!ReceiptStore.getMonitored(applicationContext).contains(pkg)) return

    val extras = sbn.notification.extras
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
    val big = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
    val body = listOf(big, text).firstOrNull { it.isNotEmpty() } ?: text

    val amount = AMOUNT_RE.find("$title $body")?.value?.trim() ?: return

    val now = System.currentTimeMillis()
    val record = JSONObject().apply {
      put("pkg", pkg)
      put("app", label)
      put("title", title)
      put("text", body)
      put("amountText", amount)
      put("timestamp", now)
    }
    ReceiptStore.appendCaptured(applicationContext, record)

    emitter?.invoke(
      mapOf(
        "pkg" to pkg,
        "app" to label,
        "title" to title,
        "text" to body,
        "amountText" to amount,
        "timestamp" to now.toDouble()
      )
    )

    postPrompt(amount, title.ifEmpty { label })
  }

  /** PendingIntent that cold-opens the app at a deep link. */
  private fun deepLink(uri: String, requestCode: Int): PendingIntent? {
    val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse(uri)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    } ?: return null
    return PendingIntent.getActivity(
      this,
      requestCode,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun appLabel(pkg: String): String =
    try {
      val pm = packageManager
      pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
    } catch (_: PackageManager.NameNotFoundException) {
      pkg
    } catch (_: Throwable) {
      pkg
    }

  private fun postPrompt(amount: String, merchant: String) {
    val nm = getSystemService(NotificationManager::class.java) ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      nm.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Digital receipts", NotificationManager.IMPORTANCE_DEFAULT)
      )
    }

    val amt = Uri.encode(amount)
    val note = Uri.encode(merchant)

    // Body tap → manual add prefilled with the captured data.
    val bodyPi = deepLink("openbudget://add/manual?amount=$amt&note=$note", 0) ?: return

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_input_add)
      .setContentTitle("Spent $amount?")
      .setContentText(
        if (merchant.isNotEmpty()) "$merchant — pick an envelope or tap to edit"
        else "Pick an envelope or tap to edit"
      )
      .setAutoCancel(true)
      .setContentIntent(bodyPi)

    // Quick action buttons for the top-used envelopes → subtract immediately.
    ReceiptStore.getQuickEnvelopes(applicationContext).take(3).forEachIndexed { i, env ->
      val uri =
        "openbudget://digital-receipts/quick-add?amount=$amt&envelope=${Uri.encode(env.first)}&note=$note"
      val pi = deepLink(uri, 100 + i)
      if (pi != null) builder.addAction(0, env.second, pi)
    }

    try {
      NotificationManagerCompat.from(this)
        .notify((System.currentTimeMillis() % 100000).toInt(), builder.build())
    } catch (_: SecurityException) {
      // POST_NOTIFICATIONS not granted (Android 13+); capture still persisted.
    }
  }
}

/** SharedPreferences-backed store shared by the service and the JS module. */
object ReceiptStore {
  private const val PREFS = "openbudget_digital_receipts"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_MONITORED = "monitored"
  private const val KEY_SEEN = "seen"
  private const val KEY_CAPTURED = "captured"
  private const val KEY_QUICK = "quick"
  private const val MAX_KEPT = 100

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isEnabled(ctx: Context): Boolean = prefs(ctx).getBoolean(KEY_ENABLED, false)
  fun setEnabled(ctx: Context, enabled: Boolean) {
    prefs(ctx).edit().putBoolean(KEY_ENABLED, enabled).apply()
  }

  fun getMonitored(ctx: Context): Set<String> {
    val arr = JSONArray(prefs(ctx).getString(KEY_MONITORED, "[]") ?: "[]")
    return buildSet { for (i in 0 until arr.length()) add(arr.getString(i)) }
  }

  fun setMonitored(ctx: Context, packages: List<String>) {
    val arr = JSONArray()
    packages.forEach { arr.put(it) }
    prefs(ctx).edit().putString(KEY_MONITORED, arr.toString()).apply()
  }

  fun getSeenJson(ctx: Context): String = prefs(ctx).getString(KEY_SEEN, "[]") ?: "[]"

  fun clearSeen(ctx: Context) {
    prefs(ctx).edit().putString(KEY_SEEN, "[]").apply()
  }

  fun recordSeen(ctx: Context, pkg: String, label: String) {
    val arr = JSONArray(getSeenJson(ctx))
    val now = System.currentTimeMillis()
    for (i in 0 until arr.length()) {
      val o = arr.getJSONObject(i)
      if (o.getString("pkg") == pkg) {
        o.put("count", o.optInt("count", 0) + 1)
        o.put("lastSeen", now)
        if (label.isNotEmpty()) o.put("label", label)
        prefs(ctx).edit().putString(KEY_SEEN, arr.toString()).apply()
        return
      }
    }
    arr.put(JSONObject().apply {
      put("pkg", pkg)
      put("label", label)
      put("count", 1)
      put("lastSeen", now)
    })
    prefs(ctx).edit().putString(KEY_SEEN, arr.toString()).apply()
  }

  /** Top envelopes for quick-add buttons, as (id, name) pairs. */
  fun getQuickEnvelopes(ctx: Context): List<Pair<String, String>> {
    val arr = JSONArray(prefs(ctx).getString(KEY_QUICK, "[]") ?: "[]")
    val out = mutableListOf<Pair<String, String>>()
    for (i in 0 until arr.length()) {
      val o = arr.getJSONObject(i)
      out.add(o.getString("id") to o.getString("name"))
    }
    return out
  }

  fun setQuickEnvelopes(ctx: Context, json: String) {
    prefs(ctx).edit().putString(KEY_QUICK, json).apply()
  }

  fun getCapturedJson(ctx: Context): String = prefs(ctx).getString(KEY_CAPTURED, "[]") ?: "[]"
  fun clearCaptured(ctx: Context) {
    prefs(ctx).edit().putString(KEY_CAPTURED, "[]").apply()
  }

  fun appendCaptured(ctx: Context, obj: JSONObject) {
    val existing = JSONArray(getCapturedJson(ctx))
    val out = JSONArray()
    out.put(obj) // newest first
    val keep = minOf(existing.length(), MAX_KEPT - 1)
    for (i in 0 until keep) out.put(existing.get(i))
    prefs(ctx).edit().putString(KEY_CAPTURED, out.toString()).apply()
  }
}
