"use client"

import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { createClient } from '@supabase/supabase-js';
import $api from '@/api/axios';
import {
  Package,
  Camera,
  CheckCircle,
  Copy,
  ExternalLink,
  ArrowLeft,
  Loader2,
  XCircle,
  Zap,
  DollarSign,
  User,
  AlertTriangle,
  Search,
  X
} from 'lucide-react';

// Конфигурация Supabase - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ
const supabaseUrl = 'https://thggdvdkvsrytiwqhsbe.supabase.co'; // например: 'https://your-project.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZ2dkdmRrdnNyeXRpd3Foc2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTIyMjIsImV4cCI6MjA2MzQ4ODIyMn0.a_-qrjwuFCv8hk0IOSGqAYHznwTlG_e3guNzUFMun3E';
const supabase = createClient(supabaseUrl, supabaseKey);

// Типы для продукта
interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  created_at?: string;
}

// Типы для результата сканирования
interface ScanResult {
  rawValue: string;
}

// Типы для результата обработки кэшбэка
interface CashbackResponse {
  success: boolean;
  message?: string;
  transactionId?: string;
  amount?: number;
  [key: string]: unknown;
}

// Типы для состояния результата обработки
interface ProcessingResult {
  success: boolean;
  data?: CashbackResponse;
  error?: string;
}

// Типы для запроса кэшбэка
interface CashbackRequest {
  phoneNumber: string;
  productId: string;
}

// Enum для состояний приложения
enum AppState {
  PRODUCT_SEARCH = 'PRODUCT_SEARCH',
  READY_TO_SCAN = 'READY_TO_SCAN',
  SCANNING = 'SCANNING',
  SCANNED = 'SCANNED',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

const DashboardPage: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.PRODUCT_SEARCH);
  const [scannedData, setScannedData] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  console.log(selectedProducts)
  // Поиск товаров в Supabase
  const searchProducts = async (query: string): Promise<void> => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setError('');

      // Поиск по названию товара (case insensitive)
      const { data, error: searchError } = await supabase
        .from('products') // ЗАМЕНИТЕ НА НАЗВАНИЕ ВАШЕЙ ТАБЛИЦЫ
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(20);

      if (searchError) {
        throw searchError;
      }

      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching products:', err);
      setError('Ошибка при поиске товаров');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced поиск
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchProducts(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleScan = (result: ScanResult[]): void => {
    if (result && result.length > 0) {
      setScannedData(result[0].rawValue);
      setCurrentState(AppState.SCANNED);
      setError('');
      setProcessingResult(null);
    }
  };

  const startScanning = (): void => {
    setError('');
    setScannedData('');
    setCurrentState(AppState.SCANNING);
    setProcessingResult(null);
  };

  const stopScanning = (): void => {
    setCurrentState(AppState.READY_TO_SCAN);
  };

  const resetToProductSearch = (): void => {
    setScannedData('');
    setError('');
    setCurrentState(AppState.PRODUCT_SEARCH);
    setProcessingResult(null);
    setSelectedProducts([]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const resetToReadyToScan = (): void => {
    setScannedData('');
    setError('');
    setCurrentState(AppState.READY_TO_SCAN);
    setProcessingResult(null);
  };

  const copyToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(scannedData);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const openLink = (): void => {
    if (scannedData.startsWith('http://') || scannedData.startsWith('https://')) {
      window.open(scannedData, '_blank');
    }
  };

  const handleProductToggle = (product: Product): void => {
    setSelectedProducts(prev => {
      const isSelected = prev.some(p => p.id === product.id);
      if (isSelected) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const confirmProductSelection = (): void => {
    if (selectedProducts.length === 0) {
      setError('Выберите хотя бы один товар');
      return;
    }
    setError('');
    setCurrentState(AppState.READY_TO_SCAN);
  };

  const clearSearch = (): void => {
    setSearchQuery('');
    setSearchResults([]);
  };


  const [log, setLog] = useState<any>(null);

  const processCashback = async (): Promise<void> => {
    if (selectedProducts.length === 0 || !scannedData) {
      setError('Выберите продукты и отсканируйте номер телефона');
      return;
    }

    try {
      setCurrentState(AppState.PROCESSING);
      setError('');

      const phoneNumber: string = scannedData.startsWith('+') ? scannedData : `+${scannedData}`;
      const sendData = { phoneNumber: phoneNumber, productId: "d56cf392-160e-4a4e-b514-1343174ba09b" }
      const res = await $api.post("/cashback/process", sendData)
      console.log(res)

      // Отправляем запросы для каждого выбранного продукта
      // const promises = selectedProducts.map(product => {
      //   const requestData: CashbackRequest = {
      //     phoneNumber: phoneNumber,
      //     productId: product.id
      //   };

      //   const awaitedFun = async () => {
      //     const res = await $api.post<any>(`/cashback/process`, requestData);
      //     return res.data
      //   }

      //   const d = awaitedFun()

      //   setLog(d)
      // });

      // const responses = await Promise.all(promises);

      // setProcessingResult({
      //   success: true,
      //   data: {
      //     success: true,
      //     message: `Кэшбэк обработан для ${responses.length} товаров`,
      //     results: responses.map(r => r.data),
      //     processedProducts: selectedProducts,
      //     phoneNumber: phoneNumber
      //   } as CashbackResponse
      // });

      // setCurrentState(AppState.RESULT);
    } catch (err: any) {
      console.error('Error processing cashback:', err);

      setProcessingResult({
        success: false,
        error: err.response?.data?.message || err.message || 'Ошибка при обработке запроса'
      });

      setCurrentState(AppState.RESULT);
    }
  };

  const totalAmount = selectedProducts.reduce((sum, product) => sum + product.price, 0);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-black to-gray-900/30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.1),transparent)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.05),transparent)]"></div>

      {/* Floating particles */}
      <h1>Amin hui</h1>
      <div>
        {JSON.stringify(log)}
      </div>
      <div className="absolute inset-0">
        {[...Array(25)].map((_, i) => (
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

      <div className="relative z-10 min-h-screen p-6">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl mb-6 shadow-2xl">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">QR КЭШБЭК</h1>
            <p className="text-gray-400">Система обработки бонусов</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${currentState === AppState.PRODUCT_SEARCH
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : selectedProducts.length > 0
                  ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                  : 'bg-gray-800/50 border border-gray-700/30 text-gray-500'
                }`}>
                <Search className="w-5 h-5" />
              </div>
              <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-500 ${selectedProducts.length > 0 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-800/50'
                }`}></div>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${currentState === AppState.READY_TO_SCAN || currentState === AppState.SCANNING
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : scannedData
                  ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                  : 'bg-gray-800/50 border border-gray-700/30 text-gray-500'
                }`}>
                <Camera className="w-5 h-5" />
              </div>
              <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-500 ${scannedData ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-800/50'
                }`}></div>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${processingResult?.success
                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                : processingResult?.error
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                  : 'bg-gray-800/50 border border-gray-700/30 text-gray-500'
                }`}>
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Поиск</span>
              <span>Сканер</span>
              <span>Результат</span>
            </div>
          </div>

          {/* Product Search State */}
          {currentState === AppState.PRODUCT_SEARCH && (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl p-6 mb-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-3xl flex items-center justify-center">
                  <Search className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Поиск товаров</h3>
                <p className="text-gray-400">Найдите и выберите товары для кэшбэка</p>
              </div>

              {/* Search Input */}
              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Введите название товара..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700/30 text-white placeholder-gray-400 px-4 py-3 pr-10 rounded-2xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all duration-300"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  ) : searchQuery ? (
                    <button
                      onClick={clearSearch}
                      className="w-5 h-5 text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  ) : (
                    <Search className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-white font-semibold mb-3">Результаты поиска ({searchResults.length})</h4>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {searchResults.map((product: Product) => {
                      const isSelected = selectedProducts.some(p => p.id === product.id);
                      return (
                        <div
                          key={product.id}
                          onClick={() => handleProductToggle(product)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${isSelected
                            ? 'border-purple-500/50 bg-purple-500/10 shadow-lg'
                            : 'border-gray-800/50 bg-gray-800/30 hover:border-gray-700/50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-white mb-1">{product.name}</h4>
                              <p className="text-purple-400 font-semibold">сом {product.price}</p>
                              {product.description && (
                                <p className="text-gray-400 text-sm mt-1">{product.description}</p>
                              )}
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-600'
                              }`}>
                              {isSelected && (
                                <CheckCircle className="w-4 h-4 text-white" fill="currentColor" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">Товары не найдены</p>
                  <p className="text-gray-500 text-sm">Попробуйте изменить поисковый запрос</p>
                </div>
              )}

              {/* Selected Products Summary */}
              {selectedProducts.length > 0 && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-6">
                  <h4 className="text-white font-semibold mb-3 flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    Выбрано товаров: {selectedProducts.length}
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedProducts.map((product) => (
                      <div key={product.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{product.name}</span>
                        <span className="text-purple-400 font-semibold">сом {product.price}</span>
                      </div>
                    ))}
                    <div className="border-t border-purple-500/20 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-white">Общая сумма:</span>
                        <span className="text-purple-400">сом {totalAmount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={confirmProductSelection}
                disabled={selectedProducts.length === 0}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-2xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-[1.02] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                <Camera className="w-5 h-5 mr-3" />
                Перейти к сканированию
              </button>

              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ready to Scan State */}
          {currentState === AppState.READY_TO_SCAN && (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl p-6 mb-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-3xl flex items-center justify-center">
                  <Camera className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Готов к сканированию</h3>
                <p className="text-gray-400 mb-4">Теперь отсканируйте QR код клиента</p>
              </div>

              {/* Selected Products Summary */}
              <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4 mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Товары к обработке ({selectedProducts.length})
                </h4>
                <div className="space-y-2">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex justify-between text-sm">
                      <span className="text-gray-300">{product.name}</span>
                      <span className="text-purple-400 font-semibold">сом {product.price}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-700/30 pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-white">Итого:</span>
                      <span className="text-purple-400">сом {totalAmount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={startScanning}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-[1.02] shadow-xl flex items-center justify-center"
                >
                  <Camera className="w-5 h-5 mr-3" />
                  Запустить сканер QR
                </button>

                <button
                  onClick={resetToProductSearch}
                  className="w-full bg-gray-700/50 border border-gray-600/30 text-white font-semibold py-3 rounded-2xl hover:bg-gray-700/70 hover:border-gray-500/50 transition-all duration-300 flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Изменить товары
                </button>
              </div>
            </div>
          )}

          {/* Scanning State */}
          {currentState === AppState.SCANNING && (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl overflow-hidden mb-6">
              <div className="p-6">
                <div className="text-center mb-4">
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-gray-700/50">
                    <Scanner
                      onScan={handleScan}
                      constraints={{
                        facingMode: 'environment'
                      }}
                      styles={{
                        container: {
                          width: '100%',
                          height: '320px'
                        }
                      }}
                    />

                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-56 h-56 border-2 border-purple-400/50 rounded-3xl relative">
                        {/* Corner indicators */}
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-purple-400 rounded-tl-2xl"></div>
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-purple-400 rounded-tr-2xl"></div>
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-purple-400 rounded-bl-2xl"></div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-purple-400 rounded-br-2xl"></div>

                        {/* Scanning line */}
                        <div className="absolute top-1/2 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse transform -translate-y-1/2 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-purple-400 rounded-full animate-bounce mx-1"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>

                  <p className="text-gray-300 mb-6">Наведите камеру на QR код</p>

                  <button
                    onClick={stopScanning}
                    className="w-full bg-red-500/20 border border-red-500/30 text-red-400 font-semibold py-3 rounded-2xl hover:bg-red-500/30 hover:border-red-500/50 transition-all duration-300 flex items-center justify-center"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Остановить сканирование
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scanned State */}
          {currentState === AppState.SCANNED && (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl p-6 mb-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 border border-green-500/30 rounded-3xl flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">QR код отсканирован!</h3>
              </div>

              <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4 mb-4">
                <div className="flex items-center mb-2">
                  <User className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="text-gray-400 text-sm">Номер телефона:</span>
                </div>
                <p className="text-white font-mono text-lg bg-gray-800/60 p-3 rounded-xl border border-gray-700/30 break-all">
                  {scannedData}
                </p>
              </div>

              {/* Transaction Summary */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <Zap className="w-4 h-4 mr-2" />
                  К обработке ({selectedProducts.length} товаров)
                </h4>
                <div className="space-y-2">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex justify-between text-sm">
                      <span className="text-gray-300">{product.name}</span>
                      <span className="text-purple-400 font-semibold">сом {product.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={copyToClipboard}
                  className="bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold py-3 rounded-2xl hover:bg-blue-500/30 hover:border-blue-500/50 transition-all duration-300 flex items-center justify-center"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Копировать
                </button>
                {(scannedData.startsWith('http://') || scannedData.startsWith('https://')) && (
                  <button
                    onClick={openLink}
                    className="bg-green-500/20 border border-green-500/30 text-green-400 font-semibold py-3 rounded-2xl hover:bg-green-500/30 hover:border-green-500/50 transition-all duration-300 flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Открыть
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={processCashback}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-[1.02] shadow-xl flex items-center justify-center"
                >
                  <DollarSign className="w-5 h-5 mr-3" />
                  Обработать кэшбэк
                </button>

                <button
                  onClick={resetToReadyToScan}
                  className="w-full bg-gray-700/50 border border-gray-600/30 text-white font-semibold py-3 rounded-2xl hover:bg-gray-700/70 hover:border-gray-500/50 transition-all duration-300"
                >
                  Сканировать другой QR
                </button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {currentState === AppState.PROCESSING && (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl p-6 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 border border-blue-500/30 rounded-3xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Обработка кэшбэка...</h3>
                <p className="text-gray-400">Отправляем данные на сервер</p>
                <div className="mt-4">
                  <div className="text-sm text-gray-500">
                    Обрабатываем {selectedProducts.length} товаров
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Result State */}
          {currentState === AppState.RESULT && processingResult && (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl p-6 mb-6">
              {processingResult.success ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 border border-green-500/30 rounded-3xl flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-green-400 mb-4">Кэшбэк успешно обработан!</h3>

                  {/* Transaction Details */}
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-6 text-left">
                    <h4 className="text-green-300 font-semibold mb-3">Детали транзакции</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Телефон:</span>
                        <span className="text-green-300 font-mono">{processingResult.data?.phoneNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Товаров:</span>
                        <span className="text-green-300">{selectedProducts.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Общая сумма:</span>
                        <span className="text-green-300 font-semibold">сом {totalAmount}</span>
                      </div>
                    </div>

                    {processingResult.data && (
                      <details className="mt-4">
                        <summary className="text-green-400 cursor-pointer hover:text-green-300 text-sm">
                          Показать ответ сервера
                        </summary>
                        <pre className="text-xs text-green-300 whitespace-pre-wrap overflow-x-auto mt-2 bg-green-500/5 p-3 rounded-xl border border-green-500/10">
                          {JSON.stringify(processingResult.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  <button
                    onClick={resetToProductSearch}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-2xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-[1.02] shadow-xl"
                  >
                    Начать заново
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 border border-red-500/30 rounded-3xl flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-red-400 mb-4">Ошибка обработки</h3>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
                    <p className="text-red-300 text-sm">{processingResult.error}</p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => setCurrentState(AppState.SCANNED)}
                      className="w-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-semibold py-4 rounded-2xl hover:bg-yellow-500/30 hover:border-yellow-500/50 transition-all duration-300"
                    >
                      Попробовать снова
                    </button>
                    <button
                      onClick={resetToProductSearch}
                      className="w-full bg-gray-700/50 border border-gray-600/30 text-white font-semibold py-3 rounded-2xl hover:bg-gray-700/70 hover:border-gray-500/50 transition-all duration-300"
                    >
                      Начать заново
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {currentState === AppState.ERROR && (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl p-6 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 border border-red-500/30 rounded-3xl flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-red-400 mb-2">Системная ошибка</h3>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
                  <p className="text-red-300">{error}</p>
                </div>
                <button
                  onClick={() => {
                    setError('');
                    setCurrentState(AppState.PRODUCT_SEARCH);
                  }}
                  className="w-full bg-gray-700/50 border border-gray-600/30 text-white font-semibold py-4 rounded-2xl hover:bg-gray-700/70 hover:border-gray-500/50 transition-all duration-300"
                >
                  Попробовать снова
                </button>
              </div>
            </div>
          )}

          {/* Help Card */}
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/30 rounded-3xl shadow-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-purple-400" />
              Инструкция по использованию
            </h4>
            <div className="space-y-3">
              {[
                { step: 1, text: "Найдите и выберите товары в поиске", icon: Search },
                { step: 2, text: "Отсканируйте QR код с номером клиента", icon: Camera },
                { step: 3, text: "Обработайте кэшбэк и получите результат", icon: DollarSign }
              ].map(({ step, text, icon: Icon }) => (
                <div key={step} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
                    {step}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">{text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;