import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="p-4 md:p-6 w-full h-full flex flex-col items-center justify-center min-h-[60vh] text-blue-600 animate-in fade-in duration-200">
      <Loader2 className="h-10 w-10 animate-spin mb-4" />
      <h2 className="text-lg font-bold text-gray-700">Yükleniyor...</h2>
      <p className="text-sm text-gray-500">Veriler hazırlanırken lütfen küçük bir an bekleyin</p>
      
      {/* Skeletons for instant feedback */}
      <div className="w-full max-w-4xl mt-8 space-y-4 opacity-50 pointer-events-none">
        <div className="h-12 bg-gray-100 rounded-lg w-full animate-pulse"></div>
        <div className="h-32 bg-gray-50 rounded-lg w-full animate-pulse"></div>
        <div className="h-64 bg-gray-50 rounded-lg w-full animate-pulse"></div>
      </div>
    </div>
  )
}
