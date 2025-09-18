"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import $api from "../api/axios";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Phone, Lock, Shield, Eye, EyeOff, Sparkles } from "lucide-react";

interface LoginFormData {
    phone: string;
    password: string;
}

export function LoginForm() {
    const [formData, setFormData] = useState<LoginFormData>({
        phone: "+996 ",
        password: ""
    });

    const [showPassword, setShowPassword] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const { login } = useAuth() as { login: Function };

    const router = useRouter();

    const [errors, setErrors] = useState<Partial<LoginFormData>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Функция для форматирования номера телефона
    const formatPhoneNumber = (value: string) => {
        // Убираем все символы кроме цифр
        const phoneNumber = value.replace(/\D/g, '');
        
        // Если номер начинается не с 996, добавляем префикс
        let formattedNumber = phoneNumber;
        if (!phoneNumber.startsWith('996')) {
            formattedNumber = '996' + phoneNumber;
        }
        
        // Форматируем номер по маске +996 XXX XXX XXX
        if (formattedNumber.length >= 3) {
            let formatted = '+996';
            const restNumber = formattedNumber.substring(3);
            
            if (restNumber.length > 0) {
                formatted += ' ' + restNumber.substring(0, 3);
            }
            if (restNumber.length > 3) {
                formatted += ' ' + restNumber.substring(3, 6);
            }
            if (restNumber.length > 6) {
                formatted += ' ' + restNumber.substring(6, 9);
            }
            
            return formatted;
        }
        
        return '+996 ';
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        
        // Не позволяем удалять префикс +996
        if (inputValue.length < 5) {
            setFormData(prev => ({ ...prev, phone: "+996 " }));
            return;
        }
        
        // Ограничиваем длину до полного номера
        if (inputValue.replace(/\D/g, '').length <= 12) {
            const formatted = formatPhoneNumber(inputValue);
            setFormData(prev => ({ ...prev, phone: formatted }));
        }
        
        if (errors.phone) {
            setErrors(prev => ({ ...prev, phone: undefined }));
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, password: e.target.value }));

        if (errors.password) {
            setErrors(prev => ({ ...prev, password: undefined }));
        }
    };

    // Обработка нажатий клавиш для предотвращения удаления префикса
    const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = e.target as HTMLInputElement;
        const cursorPosition = input.selectionStart || 0;
        
        // Предотвращаем удаление префикса +996
        if ((e.key === 'Backspace' || e.key === 'Delete') && cursorPosition <= 5) {
            e.preventDefault();
        }
    };

    const mutation = useMutation({
        mutationFn: async () => {
            // Убираем форматирование для отправки на сервер
            const cleanPhone = formData.phone.replace(/\D/g, '');
            
            const res = await $api.post("/auth/login/admin", {
                phoneNumber: `+${cleanPhone}`,
                password: formData.password
            })
            const user = res.data.user
            login({
                phoneNumber: user.phoneNumber,
                name: user.name,
            });
        },
        onSuccess: () => {
            router.push("/dashboard")
        },
        onError: (error) => {
            setErrors(prev => ({ ...prev, phone: `${error} Ошибка сети. Попробуйте позже.` }));
        }
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log(formData)
        try {
            mutation.mutate()
            setIsSubmitting(true)
        } catch (error) {
            console.log(error)
        } finally {
            setIsSubmitting(false)
        }
    };

    const isFormDisabled = isSubmitting;

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-black to-gray-900/30"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.05),transparent)]"></div>
            
            {/* Floating particles */}
            <div className="absolute inset-0">
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 3}s`
                        }}
                    />
                ))}
            </div>
            
            <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl p-8">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl mb-6 shadow-2xl relative">
                                <Shield className="w-10 h-10 text-white" />
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                    <Sparkles className="w-3 h-3 text-white" />
                                </div>
                            </div>
                            
                            <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
                                АДМИН ПАНЕЛЬ
                            </h1>
                            <h2 className="text-xl font-bold text-white mb-2">БТ ТЕХНИКА</h2>
                            <p className="text-gray-400">Вход для администраторов</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Phone Field */}
                            <div className="space-y-2">
                                <label 
                                    htmlFor="phone"
                                    className="block text-gray-300 text-sm font-medium"
                                >
                                    Номер телефона
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handlePhoneChange}
                                        onKeyDown={handlePhoneKeyDown}
                                        placeholder="+996 XXX XXX XXX"
                                        disabled={isFormDisabled}
                                        className={`w-full pl-12 pr-4 py-4 bg-gray-800/60 border-2 rounded-2xl focus:outline-none transition-all duration-300 text-lg text-white placeholder-gray-500 font-mono ${
                                            errors.phone
                                                ? 'border-red-500/50 focus:border-red-400 bg-red-500/10'
                                                : 'border-gray-700/50 focus:border-purple-500/60 hover:border-gray-600/50 focus:bg-gray-800/80'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    />
                                </div>
                                {errors.phone && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                        <p className="text-red-400 text-sm">{errors.phone}</p>
                                    </div>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label 
                                    htmlFor="password"
                                    className="block text-gray-300 text-sm font-medium"
                                >
                                    Пароль
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={handlePasswordChange}
                                        placeholder="Введите пароль"
                                        disabled={isFormDisabled}
                                        className={`w-full pl-12 pr-14 py-4 bg-gray-800/60 border-2 rounded-2xl focus:outline-none transition-all duration-300 text-lg text-white placeholder-gray-500 ${
                                            errors.password
                                                ? 'border-red-500/50 focus:border-red-400 bg-red-500/10'
                                                : 'border-gray-700/50 focus:border-purple-500/60 hover:border-gray-600/50 focus:bg-gray-800/80'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-300 z-10"
                                        disabled={isFormDisabled}
                                    >
                                        {showPassword ? 
                                            <EyeOff className="w-5 h-5" /> : 
                                            <Eye className="w-5 h-5" />
                                        }
                                    </button>
                                </div>
                                {errors.password && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                        <p className="text-red-400 text-sm">{errors.password}</p>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isFormDisabled}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-[1.02] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center group"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3"></div>
                                        Вход в систему...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300" />
                                        Войти в админ панель
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Additional Info */}
                        <div className="mt-8 pt-6 border-t border-gray-800/30">
                            <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4">
                                <div className="flex items-start space-x-3">
                                    <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded-xl flex-shrink-0">
                                        <Shield className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Безопасный вход</h3>
                                        <p className="text-gray-300 text-sm leading-relaxed">
                                            Доступ только для авторизованных администраторов системы
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Notice */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            Все действия в системе логируются для обеспечения безопасности
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}