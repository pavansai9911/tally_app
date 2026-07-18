// App-lock service.
//
// Replaces the original (broken) lock where the PIN was never stored and ANY 4 digits
// unlocked the app. The PIN is now stored as a salted SHA-256 hash inside the OS keychain
// (Android Keystore-backed), never in the SQLite DB. Biometric unlock uses the device
// fingerprint/face sensor via react-native-biometrics.

import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';
import { sha256 } from 'js-sha256';
import { getSetting, setSetting } from '@/db/database';

const PIN_SERVICE = 'com.tally.app.pin';
const SALT_KEY = 'pin_salt';

const biometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });

function hashPin(pin: string, salt: string): string {
  return sha256(`${salt}:${pin}`);
}

async function getOrCreateSalt(): Promise<string> {
  let salt = await getSetting(SALT_KEY);
  if (!salt) {
    salt = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    await setSetting(SALT_KEY, salt);
  }
  return salt;
}

export async function isPinSet(): Promise<boolean> {
  try {
    const creds = await Keychain.getGenericPassword({ service: PIN_SERVICE });
    return creds !== false;
  } catch {
    return false;
  }
}

export async function setPin(pin: string): Promise<void> {
  const salt = await getOrCreateSalt();
  await Keychain.setGenericPassword('tally-pin', hashPin(pin, salt), { service: PIN_SERVICE });
  await setSetting('lock_enabled', '1');
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const creds = await Keychain.getGenericPassword({ service: PIN_SERVICE });
    if (creds === false) return false;
    const salt = await getSetting(SALT_KEY);
    if (!salt) return false;
    return creds.password === hashPin(pin, salt);
  } catch {
    return false;
  }
}

/** Remove the PIN and disable lock + biometric (used by "Forgot PIN" reset and Settings). */
export async function clearPin(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: PIN_SERVICE });
  } catch {
    // ignore
  }
  await setSetting('lock_enabled', '0');
  await setSetting('biometric_enabled', '0');
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const { available } = await biometrics.isSensorAvailable();
    return available;
  } catch {
    return false;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await getSetting('biometric_enabled')) === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await setSetting('biometric_enabled', enabled ? '1' : '0');
}

export async function authenticateBiometric(prompt = 'Unlock Tally'): Promise<boolean> {
  try {
    const { success } = await biometrics.simplePrompt({ promptMessage: prompt, cancelButtonText: 'Use PIN' });
    return success;
  } catch {
    return false;
  }
}

export async function isLockEnabled(): Promise<boolean> {
  return (await getSetting('lock_enabled')) === '1';
}
