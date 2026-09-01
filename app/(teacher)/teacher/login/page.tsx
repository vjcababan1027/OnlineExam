'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Navbar } from '@/components/shared/Navbar';
import { GraduationCap, Lock, Mail, ArrowRight, Sparkles, User, AlertCircle } from 'lucide-react';

export default function TeacherLoginPage() {
  const router = useRouter();
  const { loginAsTeacher, registerTeacher } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mapFirebaseError = (error: string): string => {
    if (error.includes('configuration-not-found') || error.includes('auth/configuration-not-found'))
      return 'Firebase Authentication is not enabled yet. Please go to the Firebase Console → Authentication → Sign-in method → Enable Email/Password.';
    if (error.includes('wrong-password') || error.includes('invalid-credential'))
      return 'Incorrect email or password. Please try again.';
    if (error.includes('user-not-found'))
      return 'No account found with this email. Please register first.';
    if (error.includes('email-already-in-use'))
      return 'An account with this email already exists. Sign in instead.';
    if (error.includes('weak-password'))
      return 'Password must be at least 6 characters.';
    if (error.includes('invalid-email'))
      return 'Please enter a valid email address.';
    if (error.includes('too-many-requests'))
      return 'Too many failed attempts. Please wait a moment and try again.';
    if (error.includes('network-request-failed'))
      return 'Network error. Please check your internet connection.';
    return error;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      let res;
      if (isRegister) {
        res = await registerTeacher(email, password, fullName);
      } else {
        res = await loginAsTeacher(email, password, fullName);
      }

      if (res.success) {
        router.push('/teacher/dashboard');
      } else {
        setErrorMessage(mapFirebaseError(res.error || 'Authentication failed. Please check your credentials.'));
      }
    } catch (err: any) {
      setErrorMessage(mapFirebaseError(err.message || 'An unexpected error occurred.'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-7 sm:p-8 border-indigo-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <GraduationCap className="h-32 w-32 text-indigo-400" />
            </div>

            <div className="space-y-6 relative">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Teacher Security & Portal</span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {isRegister ? 'Register Teacher Account' : 'Teacher Authentication'}
                </h1>
                <p className="text-xs text-slate-400">
                  {isRegister
                    ? 'Create a verified instructor account to author and monitor exams.'
                    : 'Sign in to access your dashboard, question banks, and live results.'}
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name & Title</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input text-sm"
                        placeholder="e.g. Prof. Smith"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Instructor Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input text-sm"
                      placeholder="teacher@school.edu"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : isRegister ? 'Create Instructor Account' : 'Sign In to Dashboard'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="pt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-slate-400 hover:text-white"
                >
                  {isRegister ? 'Already have an account? Sign in' : 'Need an account? Register here'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
