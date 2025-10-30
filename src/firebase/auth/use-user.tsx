'use client';
import {Auth, onAuthStateChanged, User} from 'firebase/auth';
import React, {createContext, useContext, useEffect, useState} from 'react';
import {useAuth} from '../provider';

export interface UserProviderProps {
  children: React.ReactNode;
}

export interface UserContextValue {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
});

/**
 * Provides the currently signed-in user.
 */
export const UserProvider: React.FC<UserProviderProps> = ({children}) => {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return (
    <UserContext.Provider value={{user, loading}}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

    