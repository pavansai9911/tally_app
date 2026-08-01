package com.tally.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Automatic local backup storage for Tally.
 *
 * Writes a single encrypted backup blob to a public folder (Tally-tracker) that SURVIVES an
 * app uninstall — unlike app-private storage, which Android wipes. Because a public folder on
 * Android 11+ is only reachable with All-files access, this module also checks/requests that
 * permission (MANAGE_EXTERNAL_STORAGE).
 *
 * The blob is encrypted with AES-256-GCM using a key derived from the device's ANDROID_ID.
 * That makes it (a) unreadable to other apps, (b) integrity-checked for free — GCM's auth tag
 * fails decryption on any tampering/corruption, and (c) device-locked: a file copied to another
 * phone won't decrypt, which enforces the "same device only" requirement automatically.
 */
class TallyBackupModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "TallyBackup"

  private val folderName = "Tally-tracker"
  private val fileName = "tally-autobackup.tlyb"
  // A fixed app secret mixed with ANDROID_ID so the key is not ANDROID_ID alone.
  private val keySalt = "tally.local.backup.v1"
  private val magic = byteArrayOf('T'.code.toByte(), 'L'.code.toByte(), 'Y'.code.toByte(), 'B'.code.toByte())
  private val version: Byte = 1

  private fun backupDir(): File = File(Environment.getExternalStorageDirectory(), folderName)
  private fun backupFile(): File = File(backupDir(), fileName)

  private fun hasAllFilesAccess(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      Environment.isExternalStorageManager()
    } else {
      // Pre-R: WRITE_EXTERNAL_STORAGE (a normal runtime permission) is enough. The JS side
      // requests it via PermissionsAndroid; here we just report whether it is held.
      reactContext.checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE) ==
          android.content.pm.PackageManager.PERMISSION_GRANTED
    }
  }

  @ReactMethod
  fun isPermissionGranted(promise: Promise) {
    try {
      promise.resolve(hasAllFilesAccess())
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  /** Opens the system "All files access" toggle for this app (Android 11+). */
  @ReactMethod
  fun requestPermission(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val intent = try {
          Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
              .setData(Uri.parse("package:" + reactContext.packageName))
        } catch (e: Exception) {
          Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
        }
        // Started from a service context (no guaranteed Activity), so NEW_TASK is required.
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("REQUEST_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    try {
      val f = backupFile()
      val map: WritableMap = Arguments.createMap()
      map.putBoolean("granted", hasAllFilesAccess())
      map.putBoolean("exists", f.exists())
      map.putString("path", f.absolutePath)
      map.putDouble("modifiedAt", if (f.exists()) f.lastModified().toDouble() else 0.0)
      map.putDouble("sizeBytes", if (f.exists()) f.length().toDouble() else 0.0)
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("STATUS_FAILED", e.message, e)
    }
  }

  private fun deriveKey(): SecretKeySpec {
    val androidId = Settings.Secure.getString(reactContext.contentResolver, Settings.Secure.ANDROID_ID) ?: "no-android-id"
    val digest = MessageDigest.getInstance("SHA-256")
    val keyBytes = digest.digest((androidId + ":" + keySalt).toByteArray(Charsets.UTF_8))
    return SecretKeySpec(keyBytes, "AES")
  }

  /** Encrypt + atomically write the backup. Creates the Tally-tracker folder if needed. */
  @ReactMethod
  fun writeBackup(json: String, promise: Promise) {
    try {
      if (!hasAllFilesAccess()) {
        promise.reject("NO_PERMISSION", "Storage permission not granted")
        return
      }
      val dir = backupDir()
      if (!dir.exists()) dir.mkdirs()

      val iv = ByteArray(12)
      SecureRandom().nextBytes(iv)
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.ENCRYPT_MODE, deriveKey(), GCMParameterSpec(128, iv))
      val cipherText = cipher.doFinal(json.toByteArray(Charsets.UTF_8))

      // Envelope: MAGIC(4) | VERSION(1) | IV(12) | ciphertext+tag, base64-wrapped for a tidy file.
      val payload = ByteArray(magic.size + 1 + iv.size + cipherText.size)
      System.arraycopy(magic, 0, payload, 0, magic.size)
      payload[magic.size] = version
      System.arraycopy(iv, 0, payload, magic.size + 1, iv.size)
      System.arraycopy(cipherText, 0, payload, magic.size + 1 + iv.size, cipherText.size)
      val encoded = Base64.encodeToString(payload, Base64.NO_WRAP)

      // Write to a temp file then rename, so a crash mid-write never corrupts the good backup.
      val tmp = File(dir, "$fileName.tmp")
      tmp.writeText(encoded, Charsets.UTF_8)
      val dest = backupFile()
      if (dest.exists()) dest.delete()
      if (!tmp.renameTo(dest)) {
        dest.writeText(encoded, Charsets.UTF_8)
        tmp.delete()
      }

      val out: WritableMap = Arguments.createMap()
      out.putString("path", dest.absolutePath)
      out.putDouble("modifiedAt", dest.lastModified().toDouble())
      promise.resolve(out)
    } catch (e: Exception) {
      promise.reject("WRITE_FAILED", e.message, e)
    }
  }

  /** Read + decrypt the backup. Resolves null if missing, unreadable, or integrity check fails. */
  @ReactMethod
  fun readBackup(promise: Promise) {
    try {
      if (!hasAllFilesAccess()) {
        promise.resolve(null)
        return
      }
      val f = backupFile()
      if (!f.exists()) {
        promise.resolve(null)
        return
      }
      val payload = Base64.decode(f.readText(Charsets.UTF_8), Base64.NO_WRAP)
      val headerLen = magic.size + 1 + 12
      if (payload.size <= headerLen) {
        promise.resolve(null)
        return
      }
      for (i in magic.indices) {
        if (payload[i] != magic[i]) {
          promise.resolve(null)
          return
        }
      }
      val iv = payload.copyOfRange(magic.size + 1, magic.size + 1 + 12)
      val cipherText = payload.copyOfRange(headerLen, payload.size)
      val cipher = Cipher.getInstance("AES/GCM/NoPadding")
      cipher.init(Cipher.DECRYPT_MODE, deriveKey(), GCMParameterSpec(128, iv))
      val plain = cipher.doFinal(cipherText) // throws on tamper/wrong-device key
      promise.resolve(String(plain, Charsets.UTF_8))
    } catch (e: Exception) {
      // Corrupt / tampered / wrong device -> treat as no usable backup (caller starts fresh).
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun deleteBackup(promise: Promise) {
    try {
      val f = backupFile()
      val ok = if (f.exists()) f.delete() else true
      promise.resolve(ok)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }
}
