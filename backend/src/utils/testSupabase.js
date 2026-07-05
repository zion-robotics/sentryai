require("dotenv").config();
const supabase = require("../services/supabase");

async function test() {
  const { data, error } = await supabase.from("businesses").select("*");
  if (error) {
    console.error("❌ Supabase error:", error.message);
  } else {
    console.log("✅ Supabase connected! Tables working.");
  }
}

test();
