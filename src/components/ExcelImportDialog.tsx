/**
 * ExcelImportDialog - Excel'den ürün import bileşeni
 * 
 * Özellikler:
 * - Drag & Drop dosya yükleme
 * - SheetJS (xlsx) ile istemci tarafı Excel okuma
 * - Akıllı başlık eşleştirme (Türkçe karakter destekli)
 * - Önizleme tablosu (satır silme destekli)
 * - Toplu API gönderimi
 */

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Upload, FileSpreadsheet, Loader2, Trash2 } from 'lucide-react'

// API ve dialog props tanımları
interface ExcelImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

// Alan eşleştirme yapısı
// Her sistem alanı için olası Excel başlıkları
const FIELD_MAPPINGS = [
  { field: 'code', label: 'Ürün Kodu', required: false, aliases: ['kod', 'code', 'seri', 'ürün kodu', 'urun kodu'] },
  { field: 'name', label: 'Ürün Adı', required: true, aliases: ['ürün adı', 'urun adi', 'ad', 'isim', 'name', 'product'] },
  { field: 'category', label: 'Marka', required: false, aliases: ['marka', 'brand', 'kategori', 'cins', 'grup'] },
  { field: 'description', label: 'Paket Tipi', required: false, aliases: ['paket tipi', 'pakettipi', 'tip', 'paket', 'description'] },
  { field: 'unit', label: 'Form', required: false, aliases: ['form', 'birim', 'unit', 'ölçü', 'olcu'] },
  { field: 'purchasePrice', label: 'Ödeme Türü', required: false, aliases: ['ödeme', 'odeme', 'vade', 'peşin', 'pesin', 'payment'] },
  { field: 'salePrice', label: 'Fiyat', required: true, aliases: ['fiyat', 'price', 'ücret', 'ucret', 'tutar', 'amount'] },
  { field: 'stock', label: 'Stok', required: false, aliases: ['stok', 'stock', 'adet', 'miktar', 'mikdar', 'quantity', 'kutu içi', 'koli içi', 'paket içi'] },
]

export function ExcelImportDialog({ open, onOpenChange, onSuccess }: ExcelImportDialogProps) {
  const { toast } = useToast()
  
  // State tanımları
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  
  // Excel verisi
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<any[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [previewData, setPreviewData] = useState<any[]>([])

  /**
   * Türkçe karakterleri normalize et
   * İ→i, Ş→s, Ç→c, Ğ→g, Ü→u, Ö→o
   */
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/İ/g, 'i').replace(/I/g, 'ı')
      .replace(/Ş/g, 's').replace(/ş/g, 's')
      .replace(/Ç/g, 'c').replace(/ç/g, 'c')
      .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
      .replace(/Ü/g, 'u').replace(/ü/g, 'u')
      .replace(/Ö/g, 'o').replace(/ö/g, 'o')
      .replace(/[^a-z0-9]/g, '')
  }

  /**
   * Akıllı başlık eşleştirme
   * Excel başlıklarını sistem alanlarıyla eşleştir
   */
  const detectMapping = useCallback((excelHeaders: string[]) => {
    const detected: Record<string, string> = {}
    
    excelHeaders.forEach(header => {
      const normalized = normalizeText(header)
      
      FIELD_MAPPINGS.forEach(mapping => {
        const aliases = mapping.aliases.map(a => normalizeText(a))
        if (aliases.includes(normalized) || aliases.some(a => normalized.includes(a))) {
          detected[mapping.field] = header
        }
      })
    })
    
    return detected
  }, [])

  /**
   * Excel dosyasını parse et
   * SheetJS kullanarak istemci tarafında oku
   */
  const parseExcel = async (fileToParse: File) => {
    const buffer = await fileToParse.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Veriyi 2D array olarak al
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
    
    if (jsonData.length === 0) {
      throw new Error('Excel dosyası boş')
    }
    
    // Başlık satırını bul (ilk dolu satır)
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const row = jsonData[i]
      if (row && row.some(cell => cell && String(cell).trim() !== '')) {
        headerRowIndex = i
        break
      }
    }
    
    const excelHeaders = jsonData[headerRowIndex].map(h => String(h || '').trim())
    const dataRows = jsonData.slice(headerRowIndex + 1)
      .filter(row => row && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''))
    
    return { headers: excelHeaders, rows: dataRows }
  }

  /**
   * Dosya seçildiğinde çalışır
   */
  const handleFileSelect = async (selectedFile: File) => {
    // Dosya uzantısı kontrolü
    const validTypes = ['.xlsx', '.xls', '.csv']
    if (!validTypes.some(type => selectedFile.name.toLowerCase().endsWith(type))) {
      toast({ title: 'Hata', description: 'Sadece .xlsx, .xls, .csv dosyaları', variant: 'destructive' })
      return
    }
    
    setLoading(true)
    setFile(selectedFile)
    
    try {
      const { headers: excelHeaders, rows: dataRows } = await parseExcel(selectedFile)
      
      setHeaders(excelHeaders)
      setRows(dataRows)
      
      // Otomatik eşleştirme
      const autoMapping = detectMapping(excelHeaders)
      setMapping(autoMapping)
      
      // Önizleme verisi oluştur
      updatePreview(dataRows, excelHeaders, autoMapping)
      
      setStep('preview')
      toast({ title: 'Başarılı', description: `${dataRows.length} satır yüklendi` })
    } catch (error: any) {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Eşleştirmeye göre önizleme verisi oluştur
   */
  const updatePreview = (dataRows: any[][], excelHeaders: string[], currentMapping: Record<string, string>) => {
    const preview = dataRows.slice(0, 10).map(row => {
      const obj: any = {}
      FIELD_MAPPINGS.forEach(mapping => {
        const header = currentMapping[mapping.field]
        if (header) {
          const colIndex = excelHeaders.indexOf(header)
          if (colIndex >= 0) {
            let value = row[colIndex]
            
            // Sayısal alanları temizle
            if (mapping.field === 'salePrice' || mapping.field === 'stock') {
              if (typeof value === 'string') {
                value = value.replace(/[^0-9.,]/g, '').replace(',', '.')
                value = parseFloat(value) || 0
              }
            }
            
            obj[mapping.field] = value
          }
        }
      })
      return obj
    }).filter(p => p.name || p.salePrice) // En az ad veya fiyat olanları al
    
    setPreviewData(preview)
  }

  /**
   * Eşleştirme değiştiğinde önizlemeyi güncelle
   */
  const handleMappingChange = (field: string, header: string) => {
    const newMapping = { ...mapping, [field]: header }
    if (!header) delete newMapping[field]
    setMapping(newMapping)
    updatePreview(rows, headers, newMapping)
  }

  /**
   * Önizleme satırını sil
   */
  const removePreviewRow = (index: number) => {
    const newPreview = [...previewData]
    newPreview.splice(index, 1)
    setPreviewData(newPreview)
  }

  /**
   * Tüm veriyi API'ye gönder
   */
  const handleImport = async () => {
    if (previewData.length === 0) {
      toast({ title: 'Hata', description: 'İmport edilecek veri yok', variant: 'destructive' })
      return
    }
    
    // Zorunlu alanları kontrol et
    const requiredFields = FIELD_MAPPINGS.filter(f => f.required && !mapping[f.field])
    if (requiredFields.length > 0) {
      toast({ title: 'Hata', description: `${requiredFields.map(f => f.label).join(', ')} alanları zorunlu`, variant: 'destructive' })
      return
    }
    
    setImporting(true)
    
    try {
      const res = await fetch('/api/urunler/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: previewData })
      })
      
      if (!res.ok) throw new Error('Import başarısız')
      
      const result = await res.json()
      toast({ title: 'Başarılı', description: `${result.created || previewData.length} ürün eklendi` })
      
      onSuccess()
      handleReset()
    } catch (error: any) {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  /**
   * Dialog'u sıfırla
   */
  const handleReset = () => {
    setStep('upload')
    setFile(null)
    setHeaders([])
    setRows([])
    setMapping({})
    setPreviewData([])
    onOpenChange(false)
  }

  /**
   * Drag & Drop olayları
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleReset()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Excel'den Ürün Import
          </DialogTitle>
        </DialogHeader>

        {/* ADIM 1: DOSYA YÜKLEME */}
        {step === 'upload' && (
          <div className="py-4">
            {/* Drag & Drop Alanı */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('excel-input')?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Excel dosyasını sürükleyin veya tıklayın
              </p>
              <p className="text-xs text-gray-500">
                .xlsx, .xls, .csv desteklenir
              </p>
              
              <input
                id="excel-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>

            {/* Beklenen Sütunlar */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">Beklenen Sütunlar:</p>
              <div className="flex flex-wrap gap-2">
                {FIELD_MAPPINGS.map(f => (
                  <span key={f.field} className="text-xs bg-white border px-2 py-1 rounded">
                    {f.label}
                    {f.required && <span className="text-red-500 ml-0.5">*</span>}
                  </span>
                ))}
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Dosya okunuyor...
              </div>
            )}
          </div>
        )}

        {/* ADIM 2: BAŞLIK EŞLEŞTİRME */}
        {step === 'mapping' && (
          <div className="py-4 space-y-3">
            <p className="text-sm text-gray-600">
              Excel başlıklarını sistem alanlarıyla eşleştirin:
            </p>
            
            {FIELD_MAPPINGS.map(field => (
              <div key={field.field} className="flex items-center gap-3">
                <label className="w-32 text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </label>
                <select
                  className="flex-1 border rounded px-2 py-1.5 text-sm"
                  value={mapping[field.field] || ''}
                  onChange={e => handleMappingChange(field.field, e.target.value)}
                >
                  <option value="">-- Seç --</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                {mapping[field.field] && <span className="text-green-600 text-xs">✓</span>}
              </div>
            ))}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                Geri
              </Button>
              <Button onClick={() => setStep('preview')} className="flex-1">
                Devam Et
              </Button>
            </div>
          </div>
        )}

        {/* ADIM 3: ÖNİZLEME VE KAYIT */}
        {step === 'preview' && (
          <div className="py-4 space-y-4">
            {/* Özet */}
            <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
              <span className="text-sm text-green-700">
                {previewData.length} ürün import edilecek
              </span>
              <span className="text-xs text-green-600">
                {Object.keys(mapping).length} alan eşleşti
              </span>
            </div>

            {/* Önizleme Tablosu */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {FIELD_MAPPINGS.filter(f => mapping[f.field]).map(f => (
                      <th key={f.field} className="px-2 py-2 text-left text-xs font-medium">
                        {f.label}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center w-10">Sil</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-t">
                      {FIELD_MAPPINGS.filter(f => mapping[f.field]).map(f => (
                        <td key={f.field} className="px-2 py-1.5 text-xs">
                          {row[f.field] || '-'}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => removePreviewRow(index)}
                          className="text-red-500 hover:text-red-700"
                          title="Satırı sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Butonlar */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                İptal
              </Button>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Eşleştirme
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || previewData.length === 0}
                className="flex-1"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Kaydediliyor...</>
                ) : (
                  `Onayla ve ${previewData.length} Ürünü Kaydet`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
