import React, { useState, useEffect } from 'react';
import { Sprout, History, LogOut, LogIn, User as UserIcon, LayoutDashboard, Settings, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InputForm from './components/InputForm';
import Dashboard from './components/Dashboard';
import PlanHistory from './components/PlanHistory';
import { getCropRecommendations, RecommendationResponse } from './services/geminiService';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  User
} from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentView, setCurrentView] = useState<'input' | 'dashboard' | 'history'>('input');
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastInputs, setLastInputs] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAuthReady) {
      setSavedPlans([]);
      return;
    }

    const path = 'plans';
    const q = query(
      collection(db, path),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString()
      }));
      setSavedPlans(plans);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Failed to sign in. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentView('input');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleGeneratePlan = async (inputs: any) => {
    setIsLoading(true);
    setLastInputs(inputs);
    setError(null);
    try {
      const result = await getCropRecommendations(inputs);
      setRecommendation(result);
      setCurrentView('dashboard');
    } catch (err) {
      console.error('Error generating plan:', err);
      setError('Failed to generate plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!user) {
      setError('Please sign in to save your plans.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const path = 'plans';
    try {
      await addDoc(collection(db, path), {
        userId: user.uid,
        ...lastInputs,
        recommendation,
        createdAt: Timestamp.now(),
      });
      alert('Plan saved successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectPlan = (plan: any) => {
    setRecommendation(plan.recommendation);
    setLastInputs({
      landSize: plan.landSize,
      location: plan.location,
      soilType: plan.soilType,
      pH: plan.pH,
      waterAvailability: plan.waterAvailability,
      riskPreference: plan.riskPreference,
      droneView: plan.droneView || null,
      polygonPath: plan.polygonPath || null,
    });
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-emerald-950 font-sans selection:bg-emerald-200">
      {/* Error Boundary / Global Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-6"
          >
            <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
              <p className="text-red-900 font-bold text-sm">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-emerald-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setCurrentView('input')}
          >
            <div className="bg-emerald-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-emerald-900">
              InterCrop <span className="text-emerald-600">AI</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('history')}
              className={`p-3 rounded-xl transition-all flex items-center gap-2 font-bold ${
                currentView === 'history' ? 'bg-emerald-100 text-emerald-700' : 'text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="hidden md:inline">History</span>
            </button>
            
            {user ? (
              <div className="flex items-center gap-4 pl-4 border-l border-emerald-100">
                <div className="hidden md:block text-right">
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Welcome</div>
                  <div className="text-sm font-bold text-emerald-900">{user.displayName || user.email}</div>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleSignIn}
                className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!isAuthReady ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {!user ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md mx-auto mt-20 p-12 bg-white rounded-[40px] shadow-2xl border border-emerald-50 text-center space-y-8"
              >
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Sprout className="w-12 h-12 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-emerald-900 tracking-tight">Welcome to InterCrop AI</h2>
                  <p className="text-emerald-700/60 font-medium">Please sign in to access your farm's intelligent data-driven insights.</p>
                </div>
                <button 
                  onClick={handleSignIn}
                  className="w-full bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 group"
                >
                  <LogIn className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  Sign In with Google
                </button>
              </motion.div>
            ) : (
              <>
                {currentView === 'input' && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="max-w-2xl mx-auto space-y-8"
                  >
                    <div className="text-center space-y-4">
                      <h2 className="text-4xl md:text-5xl font-black text-emerald-900 leading-tight">
                        Grow Smarter, <br />
                        <span className="text-emerald-600">Earn More.</span>
                      </h2>
                      <p className="text-emerald-700/70 text-lg max-w-md mx-auto">
                        Get AI-powered crop allocation plans based on your land, soil, and market trends.
                      </p>
                    </div>
                    <InputForm onSubmit={handleGeneratePlan} isLoading={isLoading} />
                  </motion.div>
                )}

                {currentView === 'dashboard' && recommendation && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Dashboard 
                      data={recommendation} 
                      onRegenerate={() => handleGeneratePlan(lastInputs)}
                      onSave={handleSavePlan}
                      onBack={() => setCurrentView('input')}
                      isSaving={isSaving}
                      droneView={lastInputs?.droneView}
                      polygonPath={lastInputs?.polygonPath}
                    />
                  </motion.div>
                )}

                {currentView === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="max-w-3xl mx-auto"
                  >
                    <PlanHistory 
                      plans={savedPlans} 
                      onSelect={handleSelectPlan}
                    />
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-emerald-100 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Sprout className="w-6 h-6 text-emerald-600" />
              <h3 className="text-xl font-bold text-emerald-900">InterCrop AI</h3>
            </div>
            <p className="text-emerald-700/60 text-sm leading-relaxed">
              Empowering small and medium farmers with intelligent data-driven insights for sustainable and profitable farming.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-widest">Platform</h4>
              <ul className="space-y-2 text-sm text-emerald-600">
                <li><a href="#" className="hover:text-emerald-900 transition-colors">Recommendations</a></li>
                <li><a href="#" className="hover:text-emerald-900 transition-colors">Market Trends</a></li>
                <li><a href="#" className="hover:text-emerald-900 transition-colors">Weather Insights</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-widest">Support</h4>
              <ul className="space-y-2 text-sm text-emerald-600">
                <li><a href="#" className="hover:text-emerald-900 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-emerald-900 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-emerald-900 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="bg-emerald-50 p-6 rounded-3xl space-y-4">
            <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-widest">Stay Updated</h4>
            <p className="text-xs text-emerald-600">Get the latest farming tips and market alerts.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Email address" 
                className="flex-1 bg-white border border-emerald-100 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 focus:ring-0 transition-all"
              />
              <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all">
                Join
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-emerald-50 text-center text-xs text-emerald-400">
          © 2026 InterCrop AI. All rights reserved. Built for sustainable farming.
        </div>
      </footer>
    </div>
  );
}
