'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Users, UserPlus, Eye, EyeOff, Trash2, ShieldCheck, User, Edit, UserCog, TrendingUp, ShoppingBag, UserCheck, ChevronDown, ChevronUp, Clock, Target, Package, ListChecks, Maximize2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate, ORDER_STATUS_COLOR, ORDER_STATUS } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function EkipYonetimiPage() {
  const [team, setTeam] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('SATICI')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingMember, setViewingMember] = useState<any | null>(null)
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
                    <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${member.role === 'ADMIN' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                            {member.role === 'ADMIN' ? <ShieldCheck className="h-5 w-5 text-purple-700" /> : <User className="h-5 w-5 text-blue-700" />}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-blue-600 border-blue-100 hover:bg-blue-50 gap-2 h-9"
                            onClick={() => setViewingMember(member)}
                          >
                            <Maximize2 className="h-4 w-4" />
                            İncele
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-9 w-9"
                            title="Üyeyi Düzenle"
                            onClick={() => handleEditClick(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9"
                            title="Hesabı Sil"
                            onClick={() => handleDelete(member.id, member.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

      {/* Detay Paneli (Modal) */}
      <Dialog open={!!viewingMember} onOpenChange={() => setViewingMember(null)}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col p-0 bg-gray-50">
          <DialogHeader className="p-6 bg-white border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${viewingMember?.role === 'ADMIN' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                  {viewingMember?.role === 'ADMIN' ? <ShieldCheck className="h-7 w-7 text-purple-700" /> : <User className="h-7 w-7 text-blue-700" />}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-gray-900">{viewingMember?.name}</DialogTitle>
                  <p className="text-gray-500 font-medium">{viewingMember?.email} • <span className={viewingMember?.role === 'ADMIN' ? 'text-purple-600' : 'text-blue-600'}>{viewingMember?.role === 'ADMIN' ? 'Yönetici' : 'Satış Temsilcisi'}</span></p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-white border p-3 px-6 rounded-2xl shadow-sm text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Toplam Ciro</p>
                  <p className="text-xl font-black text-green-600">{formatCurrency(viewingMember?.stats?.totalSales || 0)}</p>
                </div>
                <div className="bg-white border p-3 px-6 rounded-2xl shadow-sm text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Müşteri Sayısı</p>
                  <p className="text-xl font-black text-blue-600">{viewingMember?.stats?.customerCount || 0}</p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Sol Sütun: Portföy Değerleri */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="bg-white border-b py-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      En Değerli Müşterileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {viewingMember?.stats?.customerDetails?.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500 italic">Atanmış müşteri bulunamadı.</p>
                      ) : (
                        viewingMember?.stats?.customerDetails.map((cust: any) => (
                          <div key={cust.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <span className="font-semibold text-gray-700">{cust.name}</span>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">{formatCurrency(cust.totalSales)}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-medium">{cust.orderCount} Sipariş</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="bg-white border-b py-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Package className="h-4 w-4 text-emerald-500" />
                      Ürün Satış Performansı
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {viewingMember?.stats?.productDetails?.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 italic py-4">Satış verisi yok.</p>
                      ) : (
                        viewingMember?.stats?.productDetails.map((prod: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600 font-medium truncate pr-4">{prod.name}</span>
                              <span className="font-bold text-gray-900">{prod.quantity} Adet</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ width: `${(prod.total / (viewingMember?.stats?.totalSales || 1)) * 100}%` }}
                              />
                            </div>
                            <p className="text-right text-[10px] text-emerald-600 font-bold">{formatCurrency(prod.total)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sağ Sütun: İşlem Geçmişi */}
              <div className="lg:col-span-2">
                <Card className="border-none shadow-sm rounded-2xl overflow-hidden h-full flex flex-col">
                  <CardHeader className="bg-white border-b py-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      Sistem İşlem Geçmişi (Son 15 Sipariş)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            <th className="px-6 py-4 border-b">Tarih</th>
                            <th className="px-6 py-4 border-b">Müşteri</th>
                            <th className="px-6 py-4 border-b">İçerik</th>
                            <th className="px-6 py-4 border-b">Durum</th>
                            <th className="px-6 py-4 border-b text-right">Tutar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {viewingMember?.stats?.recentOrders?.length === 0 ? (
                            <tr><td colSpan={5} className="p-12 text-center text-sm text-gray-500 italic">Henüz bir işlem gerçekleştirilmedi.</td></tr>
                          ) : (
                            viewingMember?.stats?.recentOrders.map((order: any) => (
                              <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4 text-xs font-medium text-gray-500">{formatDate(order.createdAt)}</td>
                                <td className="px-6 py-4">
                                  <p className="text-sm font-bold text-gray-900 leading-none">{order.customer?.user?.name}</p>
                                  <p className="text-[10px] text-gray-400 mt-1">{order.id.slice(-8).toUpperCase()}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                                    {order.orderItems?.map((item: any, idx: number) => (
                                      <span key={idx} className="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                        {item.quantity}x {item.product.name.split(' ')[0]}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${ORDER_STATUS_COLOR[order.status]}`}>
                                    {ORDER_STATUS[order.status]}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-gray-900 text-sm">
                                  {formatCurrency(order.totalAmount)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </DialogContent>
      </Dialog>
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
