import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './utils'

export function generateFatura(order: any) {
  const doc = new jsPDF()

  const customer = order.customer?.user?.name || 'Müşteri'
  const orderDate = formatDate(order.createdAt)
  const orderNo = order.id.slice(-8).toUpperCase()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('FATURA', 105, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Satis Yonetim Sistemi', 14, 35)
  doc.text('Tel: +90 XXX XXX XX XX', 14, 41)
  doc.text('E-posta: info@satis.com', 14, 47)

  doc.setFont('helvetica', 'bold')
  doc.text(`Fatura No: #${orderNo}`, 140, 35)
  doc.setFont('helvetica', 'normal')
  doc.text(`Tarih: ${orderDate}`, 140, 41)
  doc.text(`Durum: ${order.status === 'TESLIM_EDILDI' ? 'Teslim Edildi' : order.status === 'IPTAL' ? 'Iptal' : 'Hazirlaniyor'}`, 140, 47)

  doc.setLineWidth(0.5)
  doc.line(14, 55, 196, 55)

  doc.setFont('helvetica', 'bold')
  doc.text('MUSTERI BILGILERI', 14, 63)
  doc.setFont('helvetica', 'normal')
  doc.text(customer, 14, 70)
  let infoY = 76
  if (order.customer?.phone) { doc.text(`Tel: ${order.customer.phone}`, 14, infoY); infoY += 6 }
  if (order.customer?.city) { doc.text(`Sehir: ${order.customer.city}`, 14, infoY); infoY += 6 }
  if (order.customer?.address) { doc.text(`Adres: ${order.customer.address}`, 14, infoY); infoY += 6 }
  if (order.customer?.taxNumber) { doc.text(`Vergi No: ${order.customer.taxNumber}`, 14, infoY); infoY += 6 }

  const tableData = (order.orderItems || []).map((item: any, i: number) => [
    i + 1,
    item.product?.name || 'Urun',
    item.product?.unit || 'Adet',
    item.quantity,
    formatCurrency(item.unitPrice),
    formatCurrency(item.total),
  ])

  autoTable(doc, {
    startY: infoY + 6,
    head: [['#', 'Urun Adi', 'Birim', 'Miktar', 'Birim Fiyat', 'Tutar']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 70 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 30 },
      5: { cellWidth: 30 },
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('* Fiyatlar KDV dahildir.', 14, finalY)
  doc.setTextColor(0, 0, 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`TOPLAM: ${formatCurrency(order.totalAmount)}`, 196, finalY, { align: 'right' })

  const paidAmount = (order.payments || [])
    .filter((p: any) => p.status === 'ODENDI')
    .reduce((s: number, p: any) => s + p.amount, 0)

  if (paidAmount > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Odenen: ${formatCurrency(paidAmount)}`, 196, finalY + 7, { align: 'right' })
    const remaining = order.totalAmount - paidAmount
    if (remaining > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(`Kalan: ${formatCurrency(remaining)}`, 196, finalY + 14, { align: 'right' })
      doc.setTextColor(0, 0, 0)
    }
  }

  if (order.notes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Not: ${order.notes}`, 14, finalY + 25)
  }

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Bu fatura bilgisayar ortaminda uretilmistir.', 105, 285, { align: 'center' })

  doc.save(`fatura-${orderNo}.pdf`)
}
