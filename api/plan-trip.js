import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { destination, budget } = req.body;

  const placesKey = process.env.PLACES_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  console.log("Places Key Loaded:", !!placesKey);
  console.log("OpenAI Key Loaded:", !!openaiKey);

  if (!placesKey || !openaiKey) {
    return res.status(500).json({ error: "Missing API keys in environment variables" });
  }

  try {
    // Fetch top 3 hotels/restaurants/attractions
    async function getPlaces(query) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' in ' + destination)}&key=${placesKey}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.results?.slice(0, 3).map(p => ({
        name: p.name,
        rating: p.rating,
        address: p.formatted_address
      })) || [];
    }

    const hotels = await getPlaces("hotels");
    const restaurants = await getPlaces("restaurants");
    const attractions = await getPlaces("things to do");

    const prompt = `
Plan a 3-day trip to ${destination} with a budget of ${budget}.
Use these options:

Hotels: ${JSON.stringify(hotels)}
Restaurants: ${JSON.stringify(restaurants)}
Attractions: ${JSON.stringify(attractions)}
`;

    console.log("Prompt being sent to OpenAI:", prompt);

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    const gptData = await gptResponse.json();
    console.log("OpenAI Response:", gptData);

    if (gptData.error) {
      return res.status(500).json({ error: "OpenAI API error", details: gptData.error });
    }

    const plan = gptData.choices?.[0]?.message?.content || "No plan generated.";
    res.status(200).json({ plan });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}
