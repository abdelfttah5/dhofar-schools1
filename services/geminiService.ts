import { GoogleGenAI } from "@google/genai";
import { School } from "../types";

// Initialize Gemini Client safely
// In some environments, process might not be defined. We handle this to prevent app crashes.
let ai: GoogleGenAI | null = null;

try {
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) ? process.env.API_KEY : 'MISSING_KEY';
  ai = new GoogleGenAI({ apiKey });
} catch (error) {
  console.warn("Gemini AI client failed to initialize:", error);
}

export const askGeminiAdvisor = async (query: string, schools: School[]): Promise<string> => {
  if (!ai) {
    return "عذراً، خدمة المساعد الذكي غير متوفرة حالياً (API Key missing).";
  }

  try {
    // Create a simplified context of the data to send to the model
    // We limit fields to save tokens and context window
    const contextData = schools.map(s => ({
      name: s.name,
      type: s.type,
      wilayat: s.wilayat,
      grades: s.grades,
      gender: s.gender,
      hasContact: !!s.contact?.phone
    }));

    const prompt = `
      أنت مساعد ذكي لتطبيق "دليل مدارس ظفار".
      لديك قائمة بالمدارس التالية (بيانات JSON):
      ${JSON.stringify(contextData)}

      المستخدم يسأل: "${query}"

      بناءً على البيانات أعلاه، أجب على المستخدم باللغة العربية.
      - كن مفيداً ومختصراً.
      - إذا سأل عن مدرسة غير موجودة، قل أنك لا تملك معلومات عنها في قاعدة البيانات الحالية.
      - اقترح مدارس بديلة إذا كان ذلك مناسباً.
      - نسق الإجابة بشكل نقاط واضحة.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: prompt,
    });

    return response.text || "عذراً، لم أستطع تحليل البيانات في الوقت الحالي.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ أثناء الاتصال بالمساعد الذكي.";
  }
};
