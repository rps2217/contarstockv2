import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

export const initializeGemini = () => {
  if (process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
};

export const analyzeCode = async (code: string, instruction: string): Promise<string> => {
  if (!genAI) initializeGemini();
  if (!genAI) throw new Error("API Key not found in environment.");

  try {
    const model = 'gemini-2.5-flash'; 
    const prompt = `
      Act as a senior software engineer.
      I will provide you with a file content.
      
      Your task: ${instruction}
      
      Here is the file content:
      \`\`\`
      ${code}
      \`\`\`
      
      Output ONLY the new code if asking for a refactor, or the answer if asking a question. 
      If providing code, do not wrap in markdown code blocks, just plain text code.
    `;

    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "// No response generated";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `// Error communicating with Gemini: ${(error as Error).message}`;
  }
};