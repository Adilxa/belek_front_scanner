"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    phoneNumber: string;
    name: string;
    password?: string;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Проверяем наличие пользователя при загрузке
    useEffect(() => {
        const checkAuth = () => {
            try {
                const userData = localStorage.getItem('user');

                if (userData) {
                    setUser(JSON.parse(userData));
                }
            } catch (error) {
                console.error('Ошибка при проверке авторизации:', error);
                localStorage.removeItem('user');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = (userData: User) => {
        try {
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            router.push('/dashboard');
        } catch (error) {
            console.error('Ошибка при входе:', error);
        }
    };

    const logout = () => {
        try {
            localStorage.removeItem('user');
            setUser(null);
            router.push('/login');
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    };

    const value: AuthContextType = {
        user,
        login,
        logout,
        isLoading,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value} >
            {children}
        </AuthContext.Provider>
    );
}