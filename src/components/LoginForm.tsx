"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import $api from "../api/axios";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface LoginFormData {
    phone: string;
    password: string;
}

export function LoginForm() {
    const [formData, setFormData] = useState<LoginFormData>({
        phone: "",
        password: ""
    });

    const { login }: any = useAuth();

    const router = useRouter();

    const [errors, setErrors] = useState<Partial<LoginFormData>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, phone: e.target.value }));
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

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await $api.post("/auth/login/admin", {
                phoneNumber: formData.phone,
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
            setErrors(prev => ({ ...prev, phone: 'Ошибка сети. Попробуйте позже.' }));
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
        <div className="w-full max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    {/* Поле номера телефона */}
                    <div>
                        <label
                            htmlFor="phone"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Номер телефона
                        </label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            placeholder="+7 (___) ___-__-__"
                            maxLength={18}
                            disabled={isFormDisabled}
                            className={`
                w-full px-3 py-2 border rounded-lg shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-50 disabled:text-gray-500
                ${errors.phone
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-300'
                                }
              `}
                        />
                        {errors.phone && (
                            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                        )}
                    </div>

                    {/* Поле пароля */}
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Пароль
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handlePasswordChange}
                            placeholder="Введите пароль"
                            disabled={isFormDisabled}
                            className={`
                w-full px-3 py-2 border rounded-lg shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-50 disabled:text-gray-500
                ${errors.password
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-300'
                                }
              `}
                        />
                        {errors.password && (
                            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                        )}
                    </div>
                </div>

                {/* Кнопка отправки */}
                <button
                    type="submit"
                    disabled={isFormDisabled}
                    className={`
            w-full py-2 px-4 rounded-lg font-medium text-white
            transition duration-200 ease-in-out
            ${isFormDisabled
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        }
          `}
                >
                    {isSubmitting ? (
                        <span className="flex items-center justify-center">
                            <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Вход...
                        </span>
                    ) : (
                        'Войти'
                    )}
                </button>
            </form>

            {/* Дополнительные ссылки */}
            <div className="mt-6 text-center text-sm text-gray-600">
                <a href="#" className="text-blue-600 hover:text-blue-500">
                    Забыли пароль?
                </a>
            </div>
        </div>
    );
}