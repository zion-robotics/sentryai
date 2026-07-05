require("dotenv").config();
const supabase = require("../services/supabase");

async function seed() {
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      name: "SentryAI Demo Business",
      owner_name: "Demo Owner",
      tone: "friendly",
      catalog: [
        { name: "Ankara dress", price: 12500 },
        { name: "Aso-ebi package", price: 45000 }
      ]
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Error:", error.message);
  } else {
    console.log("✅ Business created! ID:", data.id);
    console.log("Add this to your .env:");
    console.log(`DEFAULT_BUSINESS_ID=${data.id}`);
  }
}

seed();
