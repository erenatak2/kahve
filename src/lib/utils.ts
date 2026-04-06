import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export const ORDER_STATUS: Record<string, string> = {
  HAZIRLANIYOR: 'Hazırlanıyor',
  KARGOYA_VERILDI: 'Kargoya Verildi',
  TESLIM_EDILDI: 'Teslim Edildi',
  IPTAL: 'İptal',
}

export const ORDER_STATUS_COLOR: Record<string, string> = {
  HAZIRLANIYOR: 'bg-yellow-100 text-yellow-800',
  KARGOYA_VERILDI: 'bg-blue-100 text-blue-800',
  TESLIM_EDILDI: 'bg-green-100 text-green-800',
  IPTAL: 'bg-red-100 text-red-800',
}

export const PAYMENT_STATUS: Record<string, string> = {
  BEKLIYOR: 'Bekliyor',
  ODENDI: 'Ödendi',
  GECIKTI: 'Gecikti',
}

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  BEKLIYOR: 'bg-yellow-100 text-yellow-800',
  ODENDI: 'bg-green-100 text-green-800',
  GECIKTI: 'bg-red-100 text-red-800',
}

export const PAYMENT_METHOD: Record<string, string> = {
  HAVALE: 'Havale / EFT',
  NAKIT: 'Nakit',
  KREDI_KARTI: 'Kredi Kartı',
}
