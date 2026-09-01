'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase/config';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginAsTeacher: (email: string, password?: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  registerTeacher: (email: string, password?: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginAsTeacher: async () => ({ success: false }),
  registerTeacher: async () => ({ success: false }),
  logout: async () => {},
});

const AUTH_STORAGE_KEY = 'ONLINE_EXAM_TEACHER_SESSION';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Live Firebase Auth Listener
    if (isFirebaseConfigured && auth && db) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          try {
            const userDoc = await getDoc(doc(db!, 'users', fbUser.uid));
            if (userDoc.exists()) {
              setUser({ uid: fbUser.uid, ...userDoc.data() } as UserProfile);
            } else {
              // Create default profile if new
              const newProfile: UserProfile = {
                uid: fbUser.uid,
                email: fbUser.email || '',
                role: 'teacher',
                fullName: fbUser.displayName || 'Instructor',
                active: true,
              };
              try {
                await setDoc(doc(db!, 'users', fbUser.uid), {
                  ...newProfile,
                  createdAt: serverTimestamp(),
                });
              } catch {
                // Firestore may not exist yet — still set user from Auth token
              }
              setUser(newProfile);
            }
          } catch (err: any) {
            // Firestore offline or not created — fall back to Auth token data
            const isOffline = err?.message?.includes('client is offline') ||
              err?.code === 'unavailable' ||
              err?.message?.includes('Failed to get document');
            if (isOffline) {
              setUser({
                uid: fbUser.uid,
                email: fbUser.email || '',
                role: 'teacher',
                fullName: fbUser.displayName || 'Instructor',
                active: true,
              });
            } else {
              console.error('Error fetching teacher profile:', err);
            }
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Local Storage Mode (Firebase not configured)
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  const loginAsTeacher = async (
    email: string,
    password: string = 'password123',
    fullName: string = 'Instructor'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isFirebaseConfigured && auth && db) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const profile: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email || email,
          fullName,
          role: 'teacher',
          active: true,
        };
        try {
          const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
          if (userDoc.exists()) {
            setUser({ uid: cred.user.uid, ...userDoc.data() } as UserProfile);
          } else {
            await setDoc(doc(db, 'users', cred.user.uid), { ...profile, createdAt: serverTimestamp() });
            setUser(profile);
          }
        } catch (firestoreErr: any) {
          // Firestore not yet created or offline — Auth succeeded, use token data
          const isOffline = firestoreErr?.message?.includes('client is offline') ||
            firestoreErr?.code === 'unavailable' ||
            firestoreErr?.message?.includes('Failed to get document');
          if (isOffline) {
            // Still allow login — Firestore will sync once the DB is created
            setUser(profile);
          } else {
            throw firestoreErr;
          }
        }
        return { success: true };
      } else {
        // Local mode login
        const teacherProfile: UserProfile = {
          uid: `teacher_${Date.now()}`,
          email,
          fullName,
          role: 'teacher',
          active: true,
        };
        setUser(teacherProfile);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(teacherProfile));
        return { success: true };
      }
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'Invalid email or password.' };
    }
  };

  const registerTeacher = async (
    email: string,
    password: string = 'password123',
    fullName: string = 'Instructor'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isFirebaseConfigured && auth && db) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const profile: UserProfile = {
          uid: cred.user.uid,
          email,
          fullName,
          role: 'teacher',
          active: true,
        };
        await setDoc(doc(db, 'users', cred.user.uid), {
          ...profile,
          createdAt: serverTimestamp(),
        });
        setUser(profile);
        return { success: true };
      } else {
        const profile: UserProfile = {
          uid: `teacher_${Date.now()}`,
          email,
          fullName,
          role: 'teacher',
          active: true,
        };
        setUser(profile);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
        return { success: true };
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginAsTeacher, registerTeacher, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
