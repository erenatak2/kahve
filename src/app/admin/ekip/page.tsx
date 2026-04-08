'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Users, UserPlus, Eye, EyeOff, Trash2, ShieldCheck, User, Edit, UserCog, TrendingUp, ShoppingBag, UserCheck, ChevronDown, ChevronUp, Clock, Target, Package, ListChecks } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate, ORDER_STATUS_COLOR, ORDER_STATUS } from '@/lib/utils'

export default function EkipYonetimiPage() {
  const [team, setTeam] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('SATICI')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()
  const router = useRouter()

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/admin/ekip')
      const data = await res.json()
      if (res.ok) {
        setTeam(data)
      } else {
        setError(data.error || 'Ekip bilgileri alınamadı.')
      }
    } catch (err) {
      setError('Bir bağlantı hatası oluştu.')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = '/api/admin/ekip'
      const payload = editingId ? { id: editingId, name, email, password, role } : { name, email, password, role }
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      
      if (res.ok) {
        toast({ title: 'Başarılı', description: editingId ? 'Ekip üyesi güncellendi.' : 'Yeni ekip üyesi sisteme eklendi.' })
        cancelEdit()
        fetchTeam() // Refresh list
        router.refresh() // Silently reload layout Server Components to update sidebar if user edited themselves
      } else {
        toast({ title: 'Hata', description: data.error || 'İşlem başarısız.', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir bağlantı hatası oluştu.', variant: 'destructive' })
    }
    setIsSubmitting(false)
  }

  const handleEditClick = (member: any) => {
    setEditingId(member.id)
    setName(member.name)
    setEmail(member.email)
    setRole(member.role)
    setPassword('') // Şifreyi boş bırakıyoruz (yenazından görünmesin, boşsa da api güncellemeycek)
    // Kaydırarak forma odaklan
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setName('')
    setEmail('')
    setPassword('')
    setRole('SATICI')
  }

  const handleDelete = async (id: string, userName: string) => {
    if (!confirm(`Dikkat! ${userName} adlı kullanıcıyı sistemden silmek istediğinize emin misiniz?`)) return

    try {
      const res = await fetch(`/api/admin/ekip?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      
      if (res.ok) {
        toast({ title: 'Silindi', description: 'Kullanıcı sistemden başarıyla kaldırıldı.' })
        fetchTeam()
        router.refresh()
      } else {
        toast({ title: 'Hata', description: data.error || 'Silinemedi.', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bağlantı hatası.', variant: 'destructive' })
    }
  }

  if (error) return <div className="p-6 text-red-500 font-medium">Hata: {error}</div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          Ekip ve Rol Yönetimi
        </h1>
        <p className="text-gray-500 text-sm mt-1">Sisteme yeni Satış Temsilcisi veya Yönetici ekleyin, mevcut hesapları yönetin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yeni Kullanıcı Formu */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                {editingId ? <UserCog className="h-5 w-5 text-gray-700" /> : <UserPlus className="h-5 w-5 text-gray-700" />}
                {editingId ? 'Üye Bilgilerini Düzenle' : 'Yeni Üye Ekle'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Ad Soyad</Label>
                  <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" />
                </div>
                <div className="space-y-2">
                  <Label>E-posta (Giriş Adresi)</Label>
                  <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ahmet@satis.com" />
                </div>
                <div className="space-y-2">
                  <Label>{editingId ? 'Sisteme Giriş Şifresi (Değiştirmek istemiyorsanız boş bırakın)' : 'Sisteme Giriş Şifresi'}</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? 'text' : 'password'} 
                      required={!editingId} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder={editingId ? 'Yeni şifre belirleyin' : 'Şifre belirleyin'} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sistem Rolü (Yetki)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                  >
                    <option value="SATICI">Satış Temsilcisi (Plasiyer - Sadece kendi müşterilerini görür)</option>
                    <option value="ADMIN">Ana Yönetici (Tüm raporları ve finansalları görür)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  {editingId && (
                    <Button type="button" onClick={cancelEdit} variant="outline" className="flex-1">
                      İptal
                    </Button>
                  )}
                  <Button type="submit" disabled={isSubmitting} className={`flex-[2] ${editingId ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                    {isSubmitting ? (editingId ? 'Güncelleniyor...' : 'Hesap Oluşturuluyor...') : (editingId ? 'Değişiklikleri Kaydet' : 'Hesabı Oluştur')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Ekip Listesi */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="text-base">Mevcut Ekip Üyeleri</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Kullanıcılar yükleniyor...</div>
              ) : team.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Kayıtlı sistem yetkilisi bulunamadı.</div>
              ) : (
                <div className="divide-y">
                  {team.map((member) => (
                    <div key={member.id} className="divide-y overflow-hidden">
                      <div 
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${expandedId === member.id ? 'bg-blue-50/30' : ''}`}
                        onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${member.role === 'ADMIN' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                              {member.role === 'ADMIN' ? <ShieldCheck className="h-5 w-5 text-purple-700" /> : <User className="h-5 w-5 text-blue-700" />}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{member.name}</p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                              member.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {member.role === 'ADMIN' ? 'YÖNETİCİ' : 'SATICI'}
                            </span>
                          </div>
                          
                          {/* Satış İstatistikleri */}
                          <div className="flex items-center gap-6 bg-white p-2 px-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="text-center">
                              <p className="text-[10px] text-gray-400 uppercase font-bold">Ciro</p>
                              <p className="text-sm font-bold text-green-600">{formatCurrency(member.stats?.totalSales || 0)}</p>
                            </div>
                            <div className="text-center border-x px-6 border-gray-100">
                              <p className="text-[10px] text-gray-400 uppercase font-bold">Sipariş</p>
                              <p className="text-sm font-bold text-gray-700">{member.stats?.orderCount || 0}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-gray-400 uppercase font-bold">Müşteri</p>
                              <p className="text-sm font-bold text-blue-600">{member.stats?.customerCount || 0}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            {expandedId === member.id ? <ChevronUp className="h-5 w-5 text-gray-400 mr-2" /> : <ChevronDown className="h-5 w-5 text-gray-400 mr-2" />}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-9 w-9"
                              title="Üyeyi Düzenle"
                              onClick={(e) => { e.stopPropagation(); handleEditClick(member); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9"
                              title="Hesabı Sil"
                              onClick={(e) => { e.stopPropagation(); handleDelete(member.id, member.name); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Detay Paneli (Expandable) */}
                      {expandedId === member.id && (
                        <div className="bg-gray-50/50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200 border-t">
                          
                          {/* İstatistik Özet Kartları */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            {/* Top Müşteriler */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col">
                              <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 mb-4">
                                <Target className="h-4 w-4 text-blue-500" />
                                Portfolio (Top Müşteriler)
                              </h3>
                              <div className="space-y-3 flex-1">
                                {member.stats?.customerDetails?.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic py-4">Henüz atanmış müşteri yok.</p>
                                ) : (
                                  member.stats.customerDetails.slice(0, 8).map((cust: any) => (
                                    <div key={cust.id} className="flex items-center justify-between group">
                                      <span className="text-sm font-medium text-gray-700 truncate mr-2" title={cust.name}>{cust.name}</span>
                                      <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[10px] text-gray-400">{cust.orderCount} Sip.</span>
                                        <span className="text-sm font-bold text-gray-900">
                                          {formatCurrency(cust.totalSales)}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Ürün Bazlı Performans */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col">
                              <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 mb-4">
                                <Package className="h-4 w-4 text-emerald-500" />
                                Neler Sattı? (Ürün Bazlı)
                              </h3>
                              <div className="space-y-3 flex-1">
                                {member.stats?.productDetails?.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic py-4">Henüz satış yapılmadı.</p>
                                ) : (
                                  member.stats.productDetails.slice(0, 8).map((prod: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-700 truncate mr-2" title={prod.name}>{prod.name}</span>
                                      <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{prod.quantity} Ad.</span>
                                        <span className="text-sm font-bold text-emerald-600">
                                          {formatCurrency(prod.total)}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Son İşlemler Detaylı */}
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col">
                              <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 mb-4">
                                <Clock className="h-4 w-4 text-orange-500" />
                                Son Siparişler ve İçerikleri
                              </h3>
                              <div className="space-y-4 flex-1 overflow-auto max-h-[300px] pr-1 custom-scrollbar">
                                {member.stats?.recentOrders?.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic py-4">Henüz işlem yok.</p>
                                ) : (
                                  member.stats.recentOrders.map((order: any) => (
                                    <div key={order.id} className="border-b border-gray-50 pb-3 last:border-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-bold text-gray-800 truncate">{order.customer?.user?.name}</p>
                                        <span className="text-[10px] text-gray-400 font-medium">{formatDate(order.createdAt)}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <div className="flex flex-wrap gap-1">
                                          {order.orderItems?.map((item: any, idx: number) => (
                                            <span key={idx} className="bg-gray-100 text-[9px] text-gray-600 px-1.5 py-0.5 rounded">
                                              {item.quantity}x {item.product.name.split(' ')[0]}...
                                            </span>
                                          ))}
                                        </div>
                                        <p className="font-bold text-xs text-blue-600 ml-2">{formatCurrency(order.totalAmount)}</p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
