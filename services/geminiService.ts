
import { GoogleGenAI } from "@google/genai";
import { School } from "../types";

// Initialize Gemini Client safely
// Browsers like Chrome/Safari might throw ReferenceError if process is accessed directly without check
let ai: GoogleGenAI | null = null;

try {
  let apiKey = 'MISSING_KEY';
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
     // @ts-ignore
     apiKey = process.env.API_KEY;
  }
  
  if (apiKey !== 'MISSING_KEY') {
     ai = new GoogleGenAI({ apiKey });
  }
} catch (error) {
  console.warn("Gemini AI client failed to initialize:", error);
}

export const askGeminiAdvisor = async (query: string, schools: School[]): Promise<string> => {
  if (!ai) {
    return "عذراً، خدمة المساعد الذكي غير متوفرة حالياً (API Key missing).";
  }

  try {
    // Create a simplified context of the data to send to the model
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
