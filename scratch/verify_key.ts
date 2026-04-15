import { GoogleGenerativeAI } from '@google/generative-ai'

async function verify() {
  const apiKey = 'AIzaSyBKLkFnt9WFxhBJm9Mx-vpC_BxK1PW-Yug'
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  try {
    const result = await model.generateContent('Hi')
    console.log('SUCCESS: API key is valid!')
    console.log('Response:', result.response.text())
  } catch (error: any) {
    console.error('ERROR: API key check failed!')
    console.error('Message:', error.message)
  }
}

verify()
