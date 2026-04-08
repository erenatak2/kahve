'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Users, UserPlus, Eye, EyeOff, Trash2, ShieldCheck, User, Edit, UserCog, TrendingUp, ShoppingBag, UserCheck, ChevronDown, ChevronUp, Clock, Target, Package, ListChecks, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate, ORDER_STATUS_COLOR, ORDER_STATUS } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function EkipYonetimiPage() {
  const [team, setTeam] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('SATICI')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [showActivityDialog, setShowActivityDialog] = useState(false)
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 h-9 border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => { setSelectedMember(member); setShowActivityDialog(true); }}
                          >
                            <Eye className="h-4 w-4" />
                            Aktivite İzle
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 h-9 w-9"
                            title="Üyeyi Düzenle"
                            onClick={() => handleEditClick(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-9 w-9"
                            title="Hesabı Sil"
                            onClick={() => handleDelete(member.id, member.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ekip Aktivite İzleme Modalı (Cari Hesap gibi) */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-6 bg-gray-50 border-b flex flex-row items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl flex items-center gap-3">
                <div className={`p-2 rounded-full ${selectedMember?.role === 'ADMIN' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                  {selectedMember?.role === 'ADMIN' ? <ShieldCheck className="h-5 w-5 text-purple-700" /> : <User className="h-5 w-5 text-blue-700" />}
                </div>
                {selectedMember?.name} - Aktivite Paneli
              </DialogTitle>
              <p className="text-xs text-gray-500">Bu personelin yönettiği müşteriler, satışlar ve performans verileri.</p>
            </div>
            <div className="flex items-center gap-4 text-right pr-8">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Toplam Ciro</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(selectedMember?.stats?.totalSales || 0)}</p>
              </div>
              <div className="border-l pl-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Müşteri Sayısı</p>
                <p className="text-lg font-bold text-blue-600">{selectedMember?.stats?.customerCount || 0}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-8">
            {/* Üst Kısım: Top Müşteriler ve Ürünler */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Portföy / Müşteriler */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Yönettiği En Değerli Müşteriler
                </h3>
                <div className="bg-white border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Müşteri Adı</TableHead>
                        <TableHead className="text-center">Sipariş</TableHead>
                        <TableHead className="text-right">T. Ciro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMember?.stats?.customerDetails?.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-500 italic">Müşteri yok.</TableCell></TableRow>
                      ) : (
                        selectedMember?.stats?.customerDetails.map((cust: any) => (
                          <TableRow key={cust.id}>
                            <TableCell className="font-medium text-gray-700">{cust.name}</TableCell>
                            <TableCell className="text-center">{cust.orderCount}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(cust.totalSales)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Ürün Bazlı Satış Performansı */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600" />
                  Satışını Yapılan Ürünler Listesi
                </h3>
                <div className="bg-white border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Ürün İsmi</TableHead>
                        <TableHead className="text-center">Adet</TableHead>
                        <TableHead className="text-right">T. Hacim</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMember?.stats?.productDetails?.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-500 italic">Satış kaydı yok.</TableCell></TableRow>
                      ) : (
                        selectedMember?.stats?.productDetails.map((prod: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-gray-700">{prod.name}</TableCell>
                            <TableCell className="text-center">
                              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">{prod.quantity} Ad.</span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-gray-900">{formatCurrency(prod.total)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Alt Kısım: Detaylı Son İşlemler */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Girilen Son Siparişler ve İçerikleri
              </h3>
              <div className="border rounded-xl overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Müşteri</TableHead>
                      <TableHead>Ürün Grupları</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMember?.stats?.recentOrders?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500 italic">Sipariş verisi yok.</TableCell></TableRow>
                    ) : (
                      selectedMember?.stats?.recentOrders.map((order: any) => (
                        <TableRow key={order.id} className="group hover:bg-gray-50">
                          <TableCell className="text-xs text-gray-500 shrink-0">{formatDate(order.createdAt)}</TableCell>
                          <TableCell className="font-semibold text-gray-800">{order.customer?.user?.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {order.orderItems?.map((item: any, idx: number) => (
                                <span key={idx} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-medium border border-blue-100">
                                  {item.quantity}x {item.product.name}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${ORDER_STATUS_COLOR[order.status]}`}>
                              {ORDER_STATUS[order.status]}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-blue-700">
                            {formatCurrency(order.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-gray-50 border-t items-center justify-between px-6">
            <p className="text-[10px] text-gray-400 italic">* Bu veriler veritabanından anlık olarak çekilen canlı performans raporlarıdır.</p>
            <Button variant="outline" onClick={() => setShowActivityDialog(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
