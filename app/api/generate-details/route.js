import { GoogleGenerativeAI } from "@google/generative-ai";

// Get your API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { topic } = await request.json();

    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });

    const prompt = `You are an expert YouTube content manager.
    A user is uploading a video about "${topic}".
    Generate a catchy, engaging video title and a short video description.
    The description should include 3-5 relevant and trending hashtags.
    Return ONLY a JSON object with two keys: "title" and "description".
    
    Example:
    {
      "title": "You WON'T BELIEVE This Viral Clip!",
      "description": "This is the craziest thing I've seen all week. \\n\\n#viral #shorts #trending"
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean the text to ensure it's valid JSON
    const jsonString = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Parse the JSON string to send as a proper JSON response
    const data = JSON.parse(jsonString);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate video details." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
