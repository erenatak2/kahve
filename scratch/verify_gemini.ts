import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function verify() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY bulunamadı!');
    return;
  }

  console.log('🔍 Gemini API testi başlatılıyor... Key:', apiKey.slice(0, 5) + '...' + apiKey.slice(-5));
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Merhaba, çalışıyor musun?');
    const response = await result.response;
    console.log('✅ Bağlantı Başarılı!');
    console.log('🤖 Yanıt:', response.text());
  } catch (error: any) {
    console.error('❌ HATA OLUŞTU:');
    console.error(error.message);
    if (error.stack) console.error(error.stack);
  }
}

verify();
