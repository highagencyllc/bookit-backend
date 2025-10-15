export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { destination, budget } = req.body;
  const apiKey = process.env.GOOGLE_API_KEY;

  try {
    // 🔹 Step 1: Get top-rated hotels, restaurants, and attractions
    async function getPlaces(query) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' in ' + destination)}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.results.slice(0, 3).map(p => ({
        name: p.name,
        rating: p.rating,
        address: p.formatted_address
      }));
    }

    const hotels = await getPlaces("hotels");
    const restaurants = await getPlaces("restaurants");
    const attractions = await getPlaces("things to do");

    // 🔹 Step 2: Ask Gemini to write an itinerary
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Plan a detailed 3-day trip to ${destination} with a budget of ${budget}. 
              Include recommendations from these real Google listings: 
              Hotels: ${JSON.stringify(hotels)} 
              Restaurants: ${JSON.stringify(restaurants)} 
              Attractions: ${JSON.stringify(attractions)}. 
              Include day-by-day itinerary with where to stay, eat, and what t
