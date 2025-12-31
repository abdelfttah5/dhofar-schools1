import { GoogleGenAI } from "@google/genai";
import { School } from "../types";

// Initialize Gemini Client
// @ts-ignore
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const askGeminiAdvisor = async (query: string, schools: School[]): Promise<string> => {
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
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "عذراً، لم أستطع تحليل البيانات في الوقت الحالي.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "حدث خطأ أثناء الاتصال بالمساعد الذكي.";
  }
};