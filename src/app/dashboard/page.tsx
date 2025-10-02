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
  X,
  Minus,
  Plus,
  CreditCard,
  Wallet,
  Edit3
} from 'lucide-react';

const supabaseUrl = 'https://thggdvdkvsrytiwqhsbe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZ2dkdmRrdnNyeXRpd3Foc2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTIyMjIsImV4cCI6MjA2MzQ4ODIyMn0.a_-qrjwuFCv8hk0IOSGqAYHznwTlG_e3guNzUFMun3E';
const supabase = createClient(supabaseUrl, supabaseKey);

const BANKS = [
  'MBank',
  'O! Bank',
  'OptimaBank',
  'Bakai Bank',
  'MBank MPLUS',
  'OGOGO',
  'INSAF Finance',
  'Банк Азии',
  'Cash2u',
  'МБулак',
  'KICB',
  'Optima',
  'ZERO',
  'О! Маркет'
];

interface Product {
  customPrice: number;
  id: string;
  name: string;
  price: number;
  description?: string;
  created_at?: string;
}

interface ManualProduct {
  name: string;
  price: number;
}

interface ScanResult {
  rawValue: string;
}

interface CashbackResponse {
  success: boolean;
  message?: string;
  transactionId?: string;
  amount?: number;
  bonusBalance?: number;
  [key: string]: any;
}

interface ProcessingResult {
  success: boolean;
  data?: CashbackResponse;
  error?: string;
}

interface ProductIdItem {
  productId: string;
  customPrice?: number;
}

interface CashbackRequest {
  phoneNumber: string;
  paymentType: string;
  productIds?: ProductIdItem[];
  products?: ManualProduct[];
}

interface DebitRequest {
  phoneNumber: string;
  amount: string;
  reason?: string;
}

enum AppState {
  PRODUCT_SEARCH = 'PRODUCT_SEARCH',
  READY_TO_SCAN = 'READY_TO_SCAN',
  SCANNING = 'SCANNING',
  SCANNED = 'SCANNED',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

enum OperationType {
  CASHBACK = 'CASHBACK',
  DEBIT = 'DEBIT'
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
  
  const [operationType, setOperationType] = useState<OperationType>(OperationType.CASHBACK);
  const [debitAmount, setDebitAmount] = useState<number>(0);
  const [bonusBalance, setBonusBalance] = useState<number | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState<boolean>(false);

  const [customPrices, setCustomPrices] = useState<{ [key: string]: number }>({});
  const [customModeProducts, setCustomModeProducts] = useState<Set<string>>(new Set());
  
  // Новые состояния для ручного товара
  const [manualProductName, setManualProductName] = useState<string>('');
  const [manualProductPrice, setManualProductPrice] = useState<number>(0);
  const [manualProducts, setManualProducts] = useState<ManualProduct[]>([]);
  
  // Выбранный банк
  const [selectedBank, setSelectedBank] = useState<string>('MBank');

  const getProductPrice = (product: Product) => {
    return customPrices[product.id] !== undefined ? customPrices[product.id] : product.price;
  };

  const searchProducts = async (query: string): Promise<void> => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setError('');

      const { data, error: searchError } = await supabase
        .from('products')
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

  const checkBonusBalance = async (phoneNumber: string): Promise<void> => {
    try {
      setIsCheckingBalance(true);
      const response = await $api.get(`/users/${phoneNumber}/balance`, {
        params: { phone: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}` }
      });
      setBonusBalance(response.data.balance || 0);
    } catch (err: any) {
      console.error('Error checking bonus balance:', err);
      setBonusBalance(0);
    } finally {
      setIsCheckingBalance(false);
    }
  };

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
      const phoneNumber = result[0].rawValue;
      setScannedData(phoneNumber);
      setCurrentState(AppState.SCANNED);
      setError('');
      setProcessingResult(null);
      checkBonusBalance(phoneNumber);
    }
  };

  const startScanning = (): void => {
    setError('');
    setScannedData('');
    setBonusBalance(null);
    setCurrentState(AppState.SCANNING);
    setProcessingResult(null);
  };

  const stopScanning = (): void => {
    setCurrentState(AppState.READY_TO_SCAN);
  };

  const resetToProductSearch = (): void => {
    setCustomPrices({});
    setScannedData('');
    setError('');
    setCurrentState(AppState.PRODUCT_SEARCH);
    setProcessingResult(null);
    setSelectedProducts([]);
    setSearchQuery('');
    setSearchResults([]);
    setBonusBalance(null);
    setDebitAmount(0);
    setOperationType(OperationType.CASHBACK);
    setManualProductName('');
    setManualProductPrice(0);
    setManualProducts([]);
    setSelectedBank('MBank');
  };

  const resetToReadyToScan = (): void => {
    setScannedData('');
    setError('');
    setCurrentState(AppState.READY_TO_SCAN);
    setProcessingResult(null);
    setBonusBalance(null);
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

  const addManualProduct = (): void => {
    if (!manualProductName.trim() || manualProductPrice <= 0) {
      setError('Введите название и цену товара');
      return;
    }

    setManualProducts(prev => [...prev, { name: manualProductName, price: manualProductPrice }]);
    setManualProductName('');
    setManualProductPrice(0);
    setError('');
  };

  const removeManualProduct = (index: number): void => {
    setManualProducts(prev => prev.filter((_, i) => i !== index));
  };

  const confirmProductSelection = (): void => {
    if (operationType === OperationType.CASHBACK && selectedProducts.length === 0 && manualProducts.length === 0) {
      setError('Выберите товары из базы или добавьте ручной товар');
      return;
    }
    setError('');
    setCurrentState(AppState.READY_TO_SCAN);
  };

  const clearSearch = (): void => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const processCashback = async (): Promise<void> => {
    if ((selectedProducts.length === 0 && manualProducts.length === 0) || !scannedData) {
      setError('Выберите продукты и отсканируйте номер телефона');
      return;
    }

    try {
      setCurrentState(AppState.PROCESSING);
      setError('');

      const phoneNumber: string = scannedData.startsWith('+') ? scannedData : `+${scannedData}`;

      // Если есть ручные товары, используем отдельный эндпоинт
      if (manualProducts.length > 0) {
        const requestData = {
          phoneNumber: phoneNumber,
          paymentType: selectedBank,
          products: manualProducts
        };

        const response = await $api.post<CashbackResponse>(`/cashback/process-direct`, requestData);

        setProcessingResult({
          success: true,
          data: {
            success: true,
            message: `Кэшбэк обработан для ${manualProducts.length} ручных товаров`,
            result: response.data,
            processedProducts: manualProducts,
            phoneNumber: phoneNumber,
            operationType: 'CASHBACK',
            paymentType: selectedBank
          } as CashbackResponse
        });
      } else {
        // Обычные товары из базы
        const productIds = selectedProducts.map((product) => ({
          productId: product.id,
          ...(customPrices[product.id] !== undefined && { customPrice: customPrices[product.id] })
        }));

        const requestData: CashbackRequest = {
          phoneNumber: phoneNumber,
          paymentType: selectedBank,
          productIds: productIds
        };

        const response = await $api.post<CashbackResponse>(`/cashback/process`, requestData);

        setProcessingResult({
          success: true,
          data: {
            success: true,
            message: `Кэшбэк обработан для ${selectedProducts.length} товаров`,
            result: response.data,
            processedProducts: selectedProducts,
            phoneNumber: phoneNumber,
            operationType: 'CASHBACK',
            paymentType: selectedBank
          } as CashbackResponse
        });
      }

      setCurrentState(AppState.RESULT);
      setCustomModeProducts(new Set());
    } catch (err: any) {
      console.error('Error processing cashback:', err);

      setProcessingResult({
        success: false,
        error: err.response?.data?.message || err.message || 'Ошибка при обработке запроса'
      });

      setCurrentState(AppState.RESULT);
    }
  };

  const processDebit = async (): Promise<void> => {
    if (!scannedData || debitAmount <= 0) {
      setError('Введите сумму для списания и отсканируйте номер телефона');
      return;
    }

    if (bonusBalance !== null && debitAmount > bonusBalance) {
      setError('Недостаточно бонусов на счете');
      return;
    }

    try {
      setCurrentState(AppState.PROCESSING);
      setError('');

      const phoneNumber: string = scannedData.startsWith('+') ? scannedData : `+${scannedData}`;

      const requestData: DebitRequest = {
        phoneNumber: phoneNumber,
        amount: String(debitAmount),
        reason: `Списание бонусов через ${selectedBank}`
      };

      const response = await $api.post<CashbackResponse>(`/cashback/deduct`, requestData);

      setProcessingResult({
        success: true,
        data: {
          ...response.data,
          operationType: 'DEBIT',
          debitedAmount: debitAmount,
          phoneNumber: phoneNumber,
          paymentType: selectedBank
        }
      });

      setCurrentState(AppState.RESULT);
    } catch (err: any) {
      console.error('Error processing debit:', err);

      setProcessingResult({
        success: false,
        error: err.response?.data?.message || err.message || 'Ошибка при списании бонусов'
      });

      setCurrentState(AppState.RESULT);
    }
  };

  const totalAmount = selectedProducts.reduce((sum, product) => sum + getProductPrice(product), 0);
  const manualTotalAmount = manualProducts.reduce((sum, product) => sum + product.price, 0);
  const grandTotal = totalAmount + manualTotalAmount;

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-black to-gray-900/30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.1),transparent)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.05),transparent)]"></div>

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
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl mb-6 shadow-2xl">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">QR КЭШБЭК</h1>
            <p className="text-gray-400">Система начисления и списания бонусов</p>
          </div>

          {currentState === AppState.PRODUCT_SEARCH && (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4 text-center">Выберите операцию</h3>

              {/* Выбор банка */}
              <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4 mb-6">
                <label className="block text-white font-semibold mb-2 flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Выберите банк/метод оплаты
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700/30 text-white px-4 py-3 rounded-2xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all duration-300"
                >
                  {BANKS.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setOperationType(OperationType.CASHBACK)}
                  className={`p-4 rounded-2xl border-2 transition-all duration-300 ${operationType === OperationType.CASHBACK
                    ? 'border-purple-500/50 bg-purple-500/10 shadow-lg'
                    : 'border-gray-800/50 bg-gray-800/30 hover:border-gray-700/50'
                    }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Plus className="w-6 h-6 text-green-400" />
                    <span className="text-white font-semibold">Начисление</span>
                    <span className="text-gray-400 text-xs text-center">Начислить кэшбэк за покупки</span>
                  </div>
                </button>

                <button
                  onClick={() => setOperationType(OperationType.DEBIT)}
                  className={`p-4 rounded-2xl border-2 transition-all duration-300 ${operationType === OperationType.DEBIT
                    ? 'border-purple-500/50 bg-purple-500/10 shadow-lg'
                    : 'border-gray-800/50 bg-gray-800/30 hover:border-gray-700/50'
                    }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Minus className="w-6 h-6 text-red-400" />
                    <span className="text-white font-semibold">Списание</span>
                    <span className="text-gray-400 text-xs text-center">Списать бонусы</span>
                  </div>
                </button>
              </div>

              {operationType === OperationType.CASHBACK && (
                <>
                  {/* Ручной ввод товара */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6">
                    <h4 className="text-white font-semibold mb-3 flex items-center">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Добавить товар вручную
                    </h4>
                    
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Название товара"
                        value={manualProductName}
                        onChange={(e) => setManualProductName(e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-700/30 text-white placeholder-gray-400 px-4 py-3 rounded-2xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300"
                      />
                      
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Цена"
                        value={manualProductPrice || ''}
                        onChange={(e) => setManualProductPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-800/50 border border-gray-700/30 text-white placeholder-gray-400 px-4 py-3 rounded-2xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-300"
                      />
                      
                      <button
                        onClick={addManualProduct}
                        className="w-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold py-3 rounded-2xl hover:bg-blue-500/30 hover:border-blue-500/50 transition-all duration-300 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Добавить товар
                      </button>
                    </div>

                    {manualProducts.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h5 className="text-gray-300 text-sm font-semibold">Добавленные товары:</h5>
                        {manualProducts.map((product, index) => (
                          <div key={index} className="flex justify-between items-center bg-gray-800/30 p-3 rounded-xl">
                            <div>
                              <span className="text-white font-medium">{product.name}</span>
                              <span className="text-blue-400 ml-2">{product.price}KGS</span>
                            </div>
                            <button
                              onClick={() => removeManualProduct(index)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-3xl flex items-center justify-center">
                      <Search className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Поиск товаров</h3>
                    <p className="text-gray-400">Найдите и выберите товары для кэшбэка</p>
                  </div>

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
                                  <p className="text-purple-400 font-semibold">{product.price}KGS</p>
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

                  {(selectedProducts.length > 0 || manualProducts.length > 0) && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-6">
                      <h4 className="text-white font-semibold mb-3 flex items-center">
                        <Package className="w-4 h-4 mr-2" />
                        Итого: {selectedProducts.length + manualProducts.length} товаров
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedProducts.map((product) => (
                          <div key={product.id} className="flex justify-between text-sm items-center">
                            <span className="text-gray-300">{product.name}</span>
                            <div className="flex items-center gap-2">
                              {customModeProducts.has(product.id) ? (
                                <>
                                  <input
                                    type="number"
                                    value={customPrices[product.id] || product.price}
                                    onChange={(e) => setCustomPrices(prev => ({
                                      ...prev,
                                      [product.id]: Number(e.target.value) || 0
                                    }))}
                                    className="bg-gray-800/50 border border-purple-400/50 text-purple-400 w-20 px-2 py-1 rounded-lg text-sm"
                                  />
                                  <button
                                    onClick={() => {
                                      setCustomModeProducts(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(product.id);
                                        return newSet;
                                      });
                                      setCustomPrices(prev => {
                                        const newPrices = { ...prev };
                                        delete newPrices[product.id];
                                        return newPrices;
                                      });
                                    }}
                                    className="text-gray-400 hover:text-white text-xs"
                                  >
                                    ✓
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="text-purple-400 font-semibold">{getProductPrice(product)}KGS</span>
                                  <button
                                    onClick={() => {
                                      setCustomModeProducts(prev => new Set([...prev, product.id]));
                                      setCustomPrices(prev => ({
                                        ...prev,
                                        [product.id]: product.price
                                      }));
                                    }}
                                    className="text-gray-400 hover:text-purple-400 text-xs"
                                  >
                                    ✎
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {manualProducts.map((product, index) => (
                          <div key={`manual-${index}`} className="flex justify-between text-sm">
                            <span className="text-gray-300">{product.name} (ручной)</span>
                            <span className="text-blue-400 font-semibold">{product.price}KGS</span>
                          </div>
                        ))}
                        <div className="border-t border-purple-500/20 pt-2 mt-2">
                          <div className="flex justify-between font-bold">
                            <span className="text-white">Общая сумма:</span>
                            <span className="text-purple-400">{grandTotal}KGS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {operationType === OperationType.DEBIT && (
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-3xl flex items-center justify-center">
                    <Wallet className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Списание бонусов</h3>
                  <p className="text-gray-400 mb-6">Введите сумму для списания с бонусного счета</p>

                  <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4 mb-6">
                    <label className="block text-gray-300 text-sm font-semibold mb-2">
                      Сумма к списанию
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={debitAmount || ''}
                        onChange={(e) => setDebitAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-800/50 border border-gray-700/30 text-white placeholder-gray-400 px-4 py-3 pl-8 rounded-2xl focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all duration-300"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={confirmProductSelection}
                disabled={operationType === OperationType.CASHBACK ? (selectedProducts.length === 0 && manualProducts.length === 0) : debitAmount <= 0}
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

          {currentState === AppState.READY_TO_SCAN && (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl p-6 mb-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-3xl flex items-center justify-center">
                  <Camera className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Готов к сканированию</h3>
                <p className="text-gray-400 mb-4">Отсканируйте QR код клиента</p>
              </div>

              <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Метод оплаты:</span>
                  <span className="text-purple-400 font-semibold">{selectedBank}</span>
                </div>
              </div>

              <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4 mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  {operationType === OperationType.CASHBACK ? (
                    <>
                      <Plus className="w-4 h-4 mr-2 text-green-400" />
                      Начисление кэшбэка ({selectedProducts.length + manualProducts.length} товаров)
                    </>
                  ) : (
                    <>
                      <Minus className="w-4 h-4 mr-2 text-red-400" />
                      Списание бонусов
                    </>
                  )}
                </h4>

                {operationType === OperationType.CASHBACK ? (
                  <div className="space-y-2">
                    {selectedProducts.map((product) => (
                      <div key={product.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{product.name}</span>
                        <div>
                          <span className="text-purple-400 font-semibold">{getProductPrice(product)}KGS</span>
                        </div>
                      </div>
                    ))}
                    {manualProducts.map((product, index) => (
                      <div key={`manual-${index}`} className="flex justify-between text-sm">
                        <span className="text-gray-300">{product.name} (ручной)</span>
                        <span className="text-blue-400 font-semibold">{product.price}KGS</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-700/30 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-white">Итого:</span>
                        <span className="text-purple-400">{grandTotal}KGS</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between font-bold">
                    <span className="text-white">К списанию:</span>
                    <span className="text-red-400">{debitAmount}KGS</span>
                  </div>
                )}
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
                  Изменить операцию
                </button>
              </div>
            </div>
          )}

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

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-56 h-56 border-2 border-purple-400/50 rounded-3xl relative">
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-purple-400 rounded-tl-2xl"></div>
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-purple-400 rounded-tr-2xl"></div>
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-purple-400 rounded-bl-2xl"></div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-purple-400 rounded-br-2xl"></div>

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

              <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 text-purple-400 mr-2" />
                    <span className="text-gray-400 text-sm">Метод оплаты:</span>
                  </div>
                  <span className="text-purple-400 font-semibold">{selectedBank}</span>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Wallet className="w-4 h-4 text-blue-400 mr-2" />
                    <span className="text-blue-300 font-semibold">Баланс бонусов:</span>
                  </div>
                  {isCheckingBalance ? (
                    <div className="flex items-center">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin mr-2" />
                      <span className="text-blue-400 text-sm">Проверяем...</span>
                    </div>
                  ) : (
                    <span className="text-blue-400 font-bold text-lg">
                      {bonusBalance !== null ? `${bonusBalance}` : 'Н/Д'}
                    </span>
                  )}
                </div>
                {bonusBalance !== null && operationType === OperationType.DEBIT && debitAmount > bonusBalance && (
                  <div className="mt-2 text-red-400 text-sm flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Недостаточно средств для списания {debitAmount}KGS
                  </div>
                )}
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  {operationType === OperationType.CASHBACK ? (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      К начислению ({selectedProducts.length + manualProducts.length} товаров)
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      К списанию
                    </>
                  )}
                </h4>

                {operationType === OperationType.CASHBACK ? (
                  <div className="space-y-2">
                    {selectedProducts.map((product) => (
                      <div key={product.id} className="flex justify-between text-sm items-center">
                        <span className="text-gray-300">{product.name}</span>
                        <div className="flex items-center gap-2">
                          {customModeProducts.has(product.id) ? (
                            <>
                              <input
                                type="number"
                                value={customPrices[product.id] || product.price}
                                onChange={(e) => setCustomPrices(prev => ({
                                  ...prev,
                                  [product.id]: Number(e.target.value) || 0
                                }))}
                                className="bg-gray-800/50 border border-purple-400/50 text-purple-400 w-20 px-2 py-1 rounded-lg text-sm"
                              />
                              <button
                                onClick={() => {
                                  setCustomModeProducts(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(product.id);
                                    return newSet;
                                  });
                                  setCustomPrices(prev => {
                                    const newPrices = { ...prev };
                                    delete newPrices[product.id];
                                    return newPrices;
                                  });
                                }}
                                className="text-gray-400 hover:text-white text-xs"
                              >
                                ✓
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-purple-400 font-semibold">{getProductPrice(product)}KGS</span>
                              <button
                                onClick={() => {
                                  setCustomModeProducts(prev => new Set([...prev, product.id]));
                                  setCustomPrices(prev => ({
                                    ...prev,
                                    [product.id]: product.price
                                  }));
                                }}
                                className="text-gray-400 hover:text-purple-400 text-xs"
                              >
                                ✎
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {manualProducts.map((product, index) => (
                      <div key={`manual-${index}`} className="flex justify-between text-sm">
                        <span className="text-gray-300">{product.name} (ручной)</span>
                        <span className="text-blue-400 font-semibold">{product.price}KGS</span>
                      </div>
                    ))}
                    <div className="border-t border-purple-500/20 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-white">Итого к начислению:</span>
                        <span className="text-green-400">
                          {Math.round(Number(grandTotal) * 0.03 * 10) / 10}KGS
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between font-bold">
                    <span className="text-white">Сумма к списанию:</span>
                    <span className="text-red-400">{debitAmount}KGS</span>
                  </div>
                )}
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
                {operationType === OperationType.CASHBACK ? (
                  <button
                    onClick={processCashback}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-[1.02] shadow-xl flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5 mr-3" />
                    Начислить кэшбэк
                  </button>
                ) : (
                  <button
                    onClick={processDebit}
                    disabled={bonusBalance !== null && debitAmount > bonusBalance}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold py-4 rounded-2xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-[1.02] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                  >
                    <Minus className="w-5 h-5 mr-3" />
                    Списать бонусы
                  </button>
                )}

                <button
                  onClick={resetToReadyToScan}
                  className="w-full bg-gray-700/50 border border-gray-600/30 text-white font-semibold py-3 rounded-2xl hover:bg-gray-700/70 hover:border-gray-500/50 transition-all duration-300"
                >
                  Сканировать другой QR
                </button>
              </div>
            </div>
          )}

          {currentState === AppState.PROCESSING && (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl p-6 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 border border-blue-500/30 rounded-3xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {operationType === OperationType.CASHBACK ? 'Обработка кэшбэка...' : 'Списание бонусов...'}
                </h3>
                <p className="text-gray-400">Отправляем данные на сервер</p>
                <div className="mt-4">
                  <div className="text-sm text-gray-500">
                    {operationType === OperationType.CASHBACK
                      ? `Обрабатываем ${selectedProducts.length + manualProducts.length} товаров через ${selectedBank}`
                      : `Списываем ${debitAmount}KGS через ${selectedBank}`
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentState === AppState.RESULT && processingResult && (
            <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl p-6 mb-6">
              {processingResult.success ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 border border-green-500/30 rounded-3xl flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-green-400 mb-4">
                    {processingResult.data?.operationType === 'DEBIT' ?
                      'Бонусы успешно списаны!' :
                      'Кэшбэк успешно обработан!'
                    }
                  </h3>

                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-6 text-left">
                    <h4 className="text-green-300 font-semibold mb-3">Детали транзакции</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Телефон:</span>
                        <span className="text-green-300 font-mono">{processingResult.data?.phoneNumber}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-300">Метод оплаты:</span>
                        <span className="text-purple-300">{processingResult.data?.paymentType || selectedBank}</span>
                      </div>

                      {processingResult.data?.operationType === 'DEBIT' ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Операция:</span>
                            <span className="text-red-300">Списание бонусов</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Списано:</span>
                            <span className="text-red-300 font-semibold">{processingResult.data?.debitedAmount}KGS</span>
                          </div>
                          {processingResult.data?.bonusBalance !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-300">Остаток:</span>
                              <span className="text-blue-300 font-semibold">{processingResult.data?.bonusBalance}KGS</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Операция:</span>
                            <span className="text-green-300">Начисление кэшбэка</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Товаров:</span>
                            <span className="text-green-300">{selectedProducts.length + manualProducts.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Общая сумма:</span>
                            <span className="text-green-300 font-semibold">{grandTotal}KGS</span>
                          </div>
                        </>
                      )}

                      {processingResult.data?.transactionId && (
                        <div className="flex justify-between">
                          <span className="text-gray-300">ID транзакции:</span>
                          <span className="text-green-300 font-mono text-xs">{processingResult.data?.transactionId}</span>
                        </div>
                      )}
                    </div>
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

          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800/30 rounded-3xl shadow-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-purple-400" />
              Инструкция по использованию
            </h4>
            <div className="space-y-3">
              {[
                { step: 1, text: "Выберите тип операции и метод оплаты", icon: CreditCard },
                { step: 2, text: "Добавьте товары из базы или введите вручную", icon: operationType === OperationType.CASHBACK ? Search : Wallet },
                { step: 3, text: "Отсканируйте QR код с номером клиента", icon: Camera },
                { step: 4, text: "Обработайте операцию и получите результат", icon: CheckCircle }
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