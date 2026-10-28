import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getDatabase, authSessionRepository } from './src/database/sqliteDb';
import type { ISqliteDb } from './src/database/sqliteDb';
import { getFileSystem } from './src/services/downloadManager';
import type { IFileSystem } from './src/services/downloadManager';
import { LoginScreen } from './src/screens/LoginScreen';
import { CurriculumScreen } from './src/screens/CurriculumScreen';
import { ChapterScreen } from './src/screens/ChapterScreen';
import { DownloadManagerScreen } from './src/screens/DownloadManagerScreen';
import type { StudentAuthResult } from './src/services/api';

type ScreenState =
  | { name: 'login' }
  | { name: 'curriculum' }
  | { name: 'chapter'; chapterId: string }
  | { name: 'downloads' };

export default function App() {
  const [db, setDb] = useState<ISqliteDb | null>(null);
  const [fs, setFs] = useState<IFileSystem | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [auth, setAuth] = useState<StudentAuthResult | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenState>({ name: 'login' });

  // Initialize DB and FileSystem on launch
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const initializedDb = await getDatabase();
        const initializedFs = await getFileSystem();

        if (isMounted) {
          setDb(initializedDb);
          setFs(initializedFs);

          // Check cached session in SQLite
          const session = await authSessionRepository.getSession(initializedDb);
          if (session) {
            setAuth({
              student: {
                id: session.studentId,
                email: session.email,
                fullName: session.fullName,
                role: session.role as any,
                isActive: true,
                createdAt: session.cachedAt,
                updatedAt: session.cachedAt,
              },
              accessToken: session.accessToken,
              refreshToken: session.refreshToken,
              isOfflineLogin: true,
            });
            setCurrentScreen({ name: 'curriculum' });
          }
          setIsReady(true);
        }
      } catch (err) {
        console.error('App initialization error:', err);
        if (isMounted) setIsReady(true);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = (authResult: StudentAuthResult) => {
    setAuth(authResult);
    setCurrentScreen({ name: 'curriculum' });
  };

  const handleLogout = async () => {
    if (db) {
      await authSessionRepository.clearSession(db);
    }
    setAuth(null);
    setCurrentScreen({ name: 'login' });
  };

  if (!isReady || !db || !fs) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashCross}>†</Text>
        <Text style={styles.splashTitle}>የሰንበት ትምህርት ቤት የመማሪያ መድረክ</Text>
        <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 20 }} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />

      {currentScreen.name === 'login' && (
        <LoginScreen db={db} onLoginSuccess={handleLoginSuccess} />
      )}

      {currentScreen.name === 'curriculum' && auth && (
        <CurriculumScreen
          db={db}
          fs={fs}
          token={auth.accessToken}
          onOpenChapter={(chapterId) => setCurrentScreen({ name: 'chapter', chapterId })}
          onOpenDownloads={() => setCurrentScreen({ name: 'downloads' })}
          onLogout={handleLogout}
        />
      )}

      {currentScreen.name === 'chapter' && auth && (
        <ChapterScreen
          chapterId={currentScreen.chapterId}
          token={auth.accessToken}
          db={db}
          onBack={() => setCurrentScreen({ name: 'curriculum' })}
        />
      )}

      {currentScreen.name === 'downloads' && (
        <DownloadManagerScreen
          db={db}
          fs={fs}
          onBack={() => setCurrentScreen({ name: 'curriculum' })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#78350f',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#78350f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashCross: {
    fontSize: 54,
    color: '#fef3c7',
    fontWeight: 'bold',
  },
  splashTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 10,
  },
});
