"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { RouteGuard } from "./RouteGuard";
import { AuthProvider } from "@/contexts/AuthContext";

interface ProvidersProps {
    children?: ReactNode;
}

const queryClient = new QueryClient()

const Providers: React.FC<ProvidersProps> = ({ children }) => {
    return (
        <AuthProvider>
            <QueryClientProvider client={queryClient}>
                <RouteGuard>
                    {children}
                </RouteGuard>
            </QueryClientProvider>
        </AuthProvider>
    )
}

export default Providers;