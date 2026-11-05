import app from "./index.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Kindora server running on port ${PORT}`);
});