import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { destination, budget } = req.body;
  const placesKey = process.env.PLACES_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  try {
    // Helper to get top 3 places from Google Places API
    async function getPlaces(query) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' in ' + destination)}&key=${placesKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!data.results) return [];
      return data.results.slice(0, 3).map(p => ({
        name: p.name,
        rating: p.rating,
        address: p.formatted_address
      }));
    }

    const hotels = await getPlaces("hotels");
    const restaurants = await getPlaces("restaurants");
    const attractions = await getPlaces("things to do");

    // Generate itinerary with GPT
    const prompt = `
Plan a 3-day trip to ${destination} with a budget of ${budget}.
Include day-by-day recommendations using these real options:

Hotels: ${JSON.stringify(hotels)}
Restaurants: ${JSON.stringify(restaurants)}
Attractions: ${JSON.stringify(attractions)}
`;

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
    const plan = gptData.choices?.[0]?.message?.content || "No plan generated.";

    res.status(200).json({ plan });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}
