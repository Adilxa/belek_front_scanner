"use client"

import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import axios, { AxiosError } from 'axios';
import $api from '@/api/axios';

// Типы для продукта
interface Product {
  id: string;
  name: string;
  price: number;
  createdAt: string;
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

// Типы для ошибки API
interface ApiError {
  message: string;
  status?: number;
  [key: string]: unknown;
}

// Enum для состояний приложения
enum AppState {
  PRODUCT_SELECTION = 'PRODUCT_SELECTION',
  READY_TO_SCAN = 'READY_TO_SCAN',
  SCANNING = 'SCANNING',
  SCANNED = 'SCANNED',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

const DashboardPage: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.PRODUCT_SELECTION);
  const [scannedData, setScannedData] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);

  // Загрузка продуктов при монтировании компонента
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await axios.get<Product[]>('https://68bb5f3d84055bce63f1cbb7.mockapi.io/products');
      setProducts(response.data);
    } catch (err) {
      const error = err as AxiosError;
      setError('Ошибка при загрузке продуктов');
      setCurrentState(AppState.ERROR);
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const resetToProductSelection = (): void => {
    setScannedData('');
    setError('');
    setCurrentState(AppState.PRODUCT_SELECTION);
    setProcessingResult(null);
    setSelectedProducts([]);
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

  const handleProductToggle = (productId: string): void => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const confirmProductSelection = (): void => {
    if (selectedProducts.length === 0) {
      setError('Выберите хотя бы один продукт');
      return;
    }
    setError('');
    setCurrentState(AppState.READY_TO_SCAN);
  };

  const processCashback = async (): Promise<void> => {
    if (selectedProducts.length === 0 || !scannedData) {
      setError('Выберите продукты и отсканируйте номер телефона');
      return;
    }

    try {
      setCurrentState(AppState.PROCESSING);
      setError('');
      
      const phoneNumber: string = scannedData.startsWith('+') ? scannedData : `+${scannedData}`;
      
      // Отправляем запросы для каждого выбранного продукта
      const promises = selectedProducts.map(productId => {
        const requestData: CashbackRequest = {
          phoneNumber: phoneNumber,
          productId: productId
        };
        return $api.post<CashbackResponse>(`/cashback/process`, requestData);
      });

      const responses = await Promise.all(promises);
      
      setProcessingResult({
        success: true,
        data: {
          success: true,
          message: `Кэшбэк обработан для ${responses.length} товаров`,
          results: responses.map(r => r.data)
        } as CashbackResponse
      });
      
      setCurrentState(AppState.RESULT);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error('Error processing cashback:', error);
      
      setProcessingResult({
        success: false,
        error: error.response?.data?.message || error.message || 'Ошибка при обработке запроса'
      });
      
      setCurrentState(AppState.RESULT);
    }
  };

  const selectedProductDetails: Product[] = products.filter(
    (product: Product) => selectedProducts.includes(product.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">QR Scanner & Cashback</h1>
          <p className="text-gray-600">Выберите товары, отсканируйте QR код и обработайте кэшбэк</p>
        </div>

        {/* Progress Indicator */}
        <div className="max-w-md mx-auto mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentState === AppState.PRODUCT_SELECTION 
                ? 'bg-blue-500 text-white' 
                : selectedProducts.length > 0
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
            }`}>1</div>
            <div className={`flex-1 h-1 mx-2 ${
              selectedProducts.length > 0 ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentState === AppState.READY_TO_SCAN || currentState === AppState.SCANNING
                ? 'bg-blue-500 text-white'
                : scannedData
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
            }`}>2</div>
            <div className={`flex-1 h-1 mx-2 ${
              scannedData ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              processingResult?.success
                ? 'bg-green-500 text-white'
                : processingResult?.error
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-300 text-gray-600'
            }`}>3</div>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Товары</span>
            <span>Сканер</span>
            <span>Результат</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-md mx-auto">
          {/* Product Selection State */}
          {currentState === AppState.PRODUCT_SELECTION && (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Выберите товары</h3>
                  <p className="text-gray-600">Выберите один или несколько товаров для кэшбэка</p>
                </div>

                {isLoading && !products.length ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-gray-600">Загрузка товаров...</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                      {products.map((product: Product) => (
                        <div
                          key={product.id}
                          onClick={() => handleProductToggle(product.id)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            selectedProducts.includes(product.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800">{product.name}</h4>
                              <p className="text-sm text-gray-600">${product.price}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedProducts.includes(product.id)
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedProducts.includes(product.id) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedProducts.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-700">
                          Выбрано товаров: <span className="font-semibold">{selectedProducts.length}</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Общая стоимость: $
                          {selectedProductDetails.reduce((sum, product) => sum + product.price, 0)}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={confirmProductSelection}
                      disabled={selectedProducts.length === 0}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      type="button"
                    >
                      Продолжить к сканированию
                    </button>
                  </>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ready to Scan State */}
          {currentState === AppState.READY_TO_SCAN && (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Готов к сканированию</h3>
                  <p className="text-gray-600 mb-4">Товары выбраны, теперь отсканируйте QR код с номером телефона</p>
                </div>

                {/* Selected Products Summary */}
                <div className="bg-gray-50 rounded-lg p-3 mb-6">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Выбранные товары ({selectedProducts.length}):</h4>
                  <div className="space-y-1">
                    {selectedProductDetails.map((product) => (
                      <div key={product.id} className="flex justify-between text-xs">
                        <span className="text-gray-700">{product.name}</span>
                        <span className="text-gray-600">${product.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={startScanning}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                    type="button"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      </svg>
                      <span>Запустить сканер</span>
                    </div>
                  </button>

                  <button
                    onClick={resetToProductSelection}
                    className="w-full bg-gray-400 text-white font-semibold py-2 px-4 rounded-xl hover:bg-gray-500 transition-colors duration-200 text-sm"
                    type="button"
                  >
                    Изменить выбор товаров
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scanning State */}
          {currentState === AppState.SCANNING && (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
              <div className="p-6">
                <div className="text-center">
                  <div className="relative mb-4 rounded-2xl overflow-hidden bg-black">
                    <Scanner
                      onScan={handleScan}
                      constraints={{
                        facingMode: 'environment'
                      }}
                      styles={{
                        container: {
                          width: '100%',
                          height: '300px'
                        }
                      }}
                    />
                    
                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-white rounded-2xl relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-blue-400 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-blue-400 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-blue-400 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-blue-400 rounded-br-lg"></div>
                        
                        {/* Scanning Line Animation */}
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse transform -translate-y-1/2"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  
                  <p className="text-gray-600 mb-4">Наведите камеру на QR код с номером телефона</p>
                  <button
                    onClick={stopScanning}
                    className="w-full bg-red-500 text-white font-semibold py-3 px-6 rounded-2xl hover:bg-red-600 transition-colors duration-200"
                    type="button"
                  >
                    Остановить сканирование
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scanned State */}
          {currentState === AppState.SCANNED && (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
              <div className="p-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">QR код отсканирован!</h3>
                  
                  <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-2">Номер телефона:</p>
                    <p className="text-gray-800 font-mono text-sm break-all bg-white p-3 rounded-lg border">
                      {scannedData}
                    </p>
                  </div>

                  {/* Selected Products Summary */}
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">К обработке ({selectedProducts.length} товаров):</h4>
                    <div className="space-y-1 text-xs">
                      {selectedProductDetails.map((product) => (
                        <div key={product.id} className="flex justify-between">
                          <span className="text-gray-700">{product.name}</span>
                          <span className="text-gray-600">${product.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={copyToClipboard}
                      className="bg-blue-500 text-white font-semibold py-3 px-4 rounded-2xl hover:bg-blue-600 transition-colors duration-200 text-sm flex items-center justify-center space-x-1"
                      type="button"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Копировать</span>
                    </button>
                    {(scannedData.startsWith('http://') || scannedData.startsWith('https://')) && (
                      <button
                        onClick={openLink}
                        className="bg-green-500 text-white font-semibold py-3 px-4 rounded-2xl hover:bg-green-600 transition-colors duration-200 text-sm flex items-center justify-center space-x-1"
                        type="button"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Открыть</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={processCashback}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-4 px-6 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
                      type="button"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span>Обработать кэшбэк</span>
                    </button>

                    <button
                      onClick={resetToReadyToScan}
                      className="w-full bg-gray-400 text-white font-semibold py-2 px-4 rounded-xl hover:bg-gray-500 transition-colors duration-200 text-sm"
                      type="button"
                    >
                      Сканировать другой QR код
                    </button>

                    <button
                      onClick={resetToProductSelection}
                      className="w-full bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-xl hover:bg-gray-400 transition-colors duration-200 text-sm"
                      type="button"
                    >
                      Изменить товары
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing State */}
          {currentState === AppState.PROCESSING && (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
              <div className="p-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Обработка кэшбэка...</h3>
                  <p className="text-gray-600">Отправляем данные на сервер, пожалуйста подождите</p>
                </div>
              </div>
            </div>
          )}

          {/* Result State */}
          {currentState === AppState.RESULT && processingResult && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              {processingResult.success ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-green-600 mb-2">Кэшбэк успешно обработан!</h3>
                  {processingResult.data && (
                    <div className="bg-green-50 rounded-lg p-3 text-sm text-gray-700">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(processingResult.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={resetToProductSelection}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                      type="button"
                    >
                      Начать заново
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-red-600 mb-2">Ошибка обработки</h3>
                  <p className="text-gray-600 text-sm mb-4">{processingResult.error}</p>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => setCurrentState(AppState.SCANNED)}
                      className="w-full bg-yellow-500 text-white font-semibold py-3 px-6 rounded-2xl hover:bg-yellow-600 transition-colors duration-200"
                      type="button"
                    >
                      Попробовать снова
                    </button>
                    <button
                      onClick={resetToProductSelection}
                      className="w-full bg-gray-500 text-white font-semibold py-2 px-4 rounded-xl hover:bg-gray-600 transition-colors duration-200 text-sm"
                      type="button"
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
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
              <div className="p-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-red-600 mb-2">Ошибка</h3>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <button
                    onClick={() => {
                      setError('');
                      setCurrentState(AppState.PRODUCT_SELECTION);
                      fetchProducts();
                    }}
                    className="w-full bg-gray-500 text-white font-semibold py-3 px-6 rounded-2xl hover:bg-gray-600 transition-colors duration-200"
                    type="button"
                  >
                    Попробовать снова
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Как использовать:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <span>Выберите один или несколько товаров из списка</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <span>Отсканируйте QR код с номером телефона клиента</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <span>Нажмите "Обработать кэшбэк" для отправки данных на сервер</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;