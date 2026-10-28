import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import type { ISqliteDb } from '../database/sqliteDb';
import { authSessionRepository } from '../database/sqliteDb';
import { mobileApiClient, isOfflineMode, setOfflineSimulated } from '../services/api';
import type { StudentAuthResult } from '../services/api';

interface LoginScreenProps {
  db: ISqliteDb;
  onLoginSuccess: (auth: StudentAuthResult) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ db, onLoginSuccess }) => {
  const [email, setEmail] = useState('student@eotc.org');
  const [password, setPassword] = useState('StudentPass123!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cachedEmail, setCachedEmail] = useState<string | null>(null);
  const [offlineState, setOfflineState] = useState(isOfflineMode());

  useEffect(() => {
    authSessionRepository.getSession(db).then((session) => {
      if (session) {
        setCachedEmail(session.email);
        setEmail(session.email);
      }
    });
  }, [db]);

  const handleToggleOffline = () => {
    const nextVal = !offlineState;
    setOfflineSimulated(nextVal);
    setOfflineState(nextVal);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('እባክዎ ኢሜይል እና የይለፍ ቃል ያስገቡ (Please enter email & password)');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const authResult = await mobileApiClient.login(email.trim(), password.trim(), db);
      setIsLoading(false);
      onLoginSuccess(authResult);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'የመግቢያ ስህተት ተከስቷል');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.emblemContainer}>
          <Text style={styles.crossIcon}>†</Text>
          <Text style={styles.appTitle}>የኢ.ኦ.ተ.ቤ.ክ ሰንበት ት/ቤት</Text>
          <Text style={styles.appSubTitle}>የተማሪዎች ከመስመር ውጭ የመማሪያ መተግበሪያ</Text>
        </View>

        {/* Offline Simulation Banner */}
        <TouchableOpacity style={styles.offlineToggleBar} onPress={handleToggleOffline}>
          <Text style={styles.offlineToggleText}>
            {offlineState ? '✈️ ከመስመር ውጭ ሁነታ በርቷል (Offline Mode ON)' : '🌐 ኦንላይን ሁነታ (Online Mode)'}
          </Text>
          <Text style={styles.offlineToggleAction}>
            {offlineState ? 'ቀይር' : 'ከመስመር ውጭ ሞክር'}
          </Text>
        </TouchableOpacity>

        {cachedEmail ? (
          <View style={styles.cachedBadge}>
            <Text style={styles.cachedBadgeText}>
              ✓ የተቀመጠ አካውንት: {cachedEmail} (ከመስመር ውጭ መግባት ይቻላል)
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ኢሜይል (Email):</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="student@eotc.org"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>የይለፍ ቃል (Password):</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>ይግቡ (Sign In)</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          አንዴ ከገቡ በኋላ የወረዱ መጻሕፍትን እና ፈተናዎችን ያለ ኢንተርኔት መማር ይችላሉ።
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#78350f',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  emblemContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  crossIcon: {
    fontSize: 36,
    color: '#92400e',
    fontWeight: 'bold',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#78350f',
    marginTop: 4,
  },
  appSubTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  offlineToggleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  offlineToggleText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: 'bold',
  },
  offlineToggleAction: {
    fontSize: 11,
    color: '#b45309',
    textDecorationLine: 'underline',
  },
  cachedBadge: {
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  cachedBadgeText: {
    fontSize: 11,
    color: '#065f46',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#b91c1c',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  loginButton: {
    backgroundColor: '#92400e',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  loginButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  footerNote: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
});
