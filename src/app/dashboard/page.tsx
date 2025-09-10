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
  [key: string]: unknown ;
}

const DashboardPage: React.FC = () => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
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
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = (result: ScanResult[]): void => {
    if (result && result.length > 0) {
      setScannedData(result[0].rawValue);
      setIsScanning(false);
      setError('');
      setProcessingResult(null);
    }
  };

  const startScanning = (): void => {
    setError('');
    setScannedData('');
    setIsScanning(true);
    setProcessingResult(null);
  };

  const stopScanning = (): void => {
    setIsScanning(false);
  };

  const resetScanner = (): void => {
    setScannedData('');
    setError('');
    setIsScanning(false);
    setProcessingResult(null);
    setSelectedProduct('');
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

  const processCashback = async (): Promise<void> => {
    if (!selectedProduct || !scannedData) {
      setError('Сначала отсканируйте номер телефона и выберите продукт');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const phoneNumber: string = scannedData.startsWith('+') ? scannedData : `+${scannedData}`;
      
      const requestData: CashbackRequest = {
        phoneNumber: phoneNumber,
        productId: selectedProduct
      };

      const response = await $api.post<CashbackResponse>(
        `/cashback/process`,
        requestData
      );

      setProcessingResult({
        success: true,
        data: response.data
      });
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error('Error processing cashback:', error);
      
      setProcessingResult({
        success: false,
        error: error.response?.data?.message || error.message || 'Ошибка при обработке запроса'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setSelectedProduct(event.target.value);
  };

  const selectedProductDetails: Product | undefined = products.find(
    (product: Product) => product.id === selectedProduct
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">QR Scanner & Cashback</h1>
          <p className="text-gray-600">Сканируйте QR коды и обрабатывайте кэшбэк</p>
        </div>

        {/* Main Content */}
        <div className="max-w-md mx-auto">
          {/* Scanner Card */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
            <div className="p-6">
              {!isScanning && !scannedData && !error && (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Готов к сканированию</h3>
                  <p className="text-gray-600 mb-6">Нажмите кнопку для запуска камеры</p>
                  <button
                    onClick={startScanning}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                    type="button"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Запустить сканер</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Camera View */}
              {isScanning && (
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
              )}

              {/* Scanned Data */}
              {scannedData && (
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">QR код отсканирован!</h3>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                    <p className="text-sm text-gray-600 mb-2">Номер телефона:</p>
                    <p className="text-gray-800 font-mono text-sm break-all bg-white p-3 rounded-lg border">
                      {scannedData}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
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

                  {/* Product Selection - показываем только ПОСЛЕ сканирования */}
                  {!selectedProduct && (
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Выберите продукт</h4>
                      {isLoading && !products.length ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="ml-2 text-gray-600">Загрузка продуктов...</span>
                        </div>
                      ) : (
                        <select
                          value={selectedProduct}
                          onChange={handleProductChange}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                        >
                          <option value="">Выберите продукт</option>
                          {products.map((product: Product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - ${product.price}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Показываем выбранный продукт и кнопку обработки */}
                  {selectedProduct && selectedProductDetails && (
                    <div className="mb-4">
                      <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Выбранный продукт:</h4>
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Название:</span> {selectedProductDetails.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Цена:</span> ${selectedProductDetails.price}
                        </p>
                        <p className="text-sm text-gray-500">
                          <span className="font-semibold">ID:</span> {selectedProductDetails.id}
                        </p>
                      </div>
                      
                      <button
                        onClick={processCashback}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-4 px-6 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mb-3"
                        type="button"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Обработка...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <span>Обработать кэшбэк</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setSelectedProduct('')}
                        className="w-full bg-gray-400 text-white font-semibold py-2 px-4 rounded-xl hover:bg-gray-500 transition-colors duration-200 text-sm"
                        type="button"
                      >
                        Выбрать другой продукт
                      </button>
                    </div>
                  )}

                  <button
                    onClick={resetScanner}
                    className="w-full bg-gray-500 text-white font-semibold py-3 px-6 rounded-2xl hover:bg-gray-600 transition-colors duration-200"
                    type="button"
                  >
                    Сканировать ещё
                  </button>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-red-600 mb-2">Ошибка</h3>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <button
                    onClick={resetScanner}
                    className="w-full bg-gray-500 text-white font-semibold py-3 px-6 rounded-2xl hover:bg-gray-600 transition-colors duration-200"
                    type="button"
                  >
                    Попробовать снова
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Processing Result */}
          {processingResult && (
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
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-red-600 mb-2">Ошибка обработки</h3>
                  <p className="text-gray-600 text-sm">{processingResult.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Info Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Как использовать:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <span>Запустите сканер и отсканируйте QR с номером телефона</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <span>Выберите продукт из списка</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <span>Нажмите &quot;Обработать кэшбэк&quot; для отправки данных</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;