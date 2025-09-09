"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function RouteGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading }: any = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                if (pathname !== '/login') {
                    router.push('/login');
                }
            } else {
                if (pathname === '/login' || pathname === '/') {
                    router.push('/dashboard');
                }
            }
        }
    }, [isAuthenticated, isLoading, pathname, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return <>{children}</>;
}