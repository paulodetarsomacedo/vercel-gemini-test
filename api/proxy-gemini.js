// Importa a biblioteca de autenticação do Google
import { GoogleAuth } from 'google-auth-library';

// Handler da Vercel: todo request para /api/proxy-gemini vai executar isso
export default async function handler(request, response) {
    try {
        // --- 1. AUTENTICAÇÃO SEGURA ---
        // Pega as credenciais do "cofre" da Vercel (Environment Variables)
        const serviceAccountJsonString = process.env.GOOGLE_CREDENTIALS_JSON;
        if (!serviceAccountJsonString) {
            throw new Error("Credenciais do Google não encontradas no ambiente.");
        }
        const serviceAccountJson = JSON.parse(serviceAccountJsonString);

        // Cria um cliente de autenticação com as credenciais
        const auth = new GoogleAuth({
            credentials: serviceAccountJson,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });

        // Pega o token de acesso temporário (a "pulseirinha da festa")
        const accessToken = await auth.getAccessToken();

        // --- 2. CHAMADA PARA A VERTEX AI ---
        const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
        if (!PROJECT_ID) {
            throw new Error("ID do Projeto Google não encontrado no ambiente.");
        }
        const API_ENDPOINT = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/gemini-1.5-flash-001:generateContent`;

        const requestBody = {
            contents: [{ parts: [{ text: "Qual a capital do Brasil?" }] }],
        };

        const geminiResponse = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`, // Usa o token, não a chave de API!
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await geminiResponse.json();

        if (!geminiResponse.ok) {
            console.error("Erro da API do Gemini:", data);
            throw new Error(data.error?.message || "Erro na chamada para a API do Gemini");
        }
        
        // --- 3. RETORNO PARA O FRONTEND ---
        const textoTraduzido = data.candidates[0].content.parts[0].text;
        response.status(200).json({ texto: textoTraduzido });

    } catch (error) {
        console.error("Erro no proxy da Vercel:", error);
        response.status(500).json({ error: error.message });
    }
}