package expo.modules.notificationreader

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationReaderModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No Android context")

  override fun definition() = ModuleDefinition {
    Name("NotificationReader")

    Events("onCapture")

    // While JS is alive, forward captures to it in real time. Captures are also
    // persisted natively so they survive when the app isn't running.
    OnCreate {
      ReceiptNotificationListenerService.emitter = { payload ->
        try {
          sendEvent("onCapture", payload)
        } catch (_: Throwable) {
        }
      }
    }
    OnDestroy {
      ReceiptNotificationListenerService.emitter = null
    }

    // True if the user has granted this app Notification access.
    Function("hasAccess") {
      NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
    }

    // Opens the system "Notification access" settings screen.
    Function("openSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // Master switch: when on, the service records seen apps and captures from
    // the selected ones; when off it does nothing.
    Function("setEnabled") { enabled: Boolean ->
      ReceiptStore.setEnabled(context, enabled)
    }

    // The apps the user picked to pull receipts from (exact package names).
    Function("setMonitoredPackages") { packages: List<String> ->
      ReceiptStore.setMonitored(context, packages)
    }

    // Apps that have posted notifications since monitoring started (discovery).
    Function("getSeenAppsJson") {
      ReceiptStore.getSeenJson(context)
    }

    Function("clearSeenApps") {
      ReceiptStore.clearSeen(context)
    }

    // All captured payment notifications as a JSON string.
    Function("getCapturedJson") {
      ReceiptStore.getCapturedJson(context)
    }

    Function("clearCaptured") {
      ReceiptStore.clearCaptured(context)
    }
  }
}
