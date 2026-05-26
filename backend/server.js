const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const caseRoutes = require("./routes/caseRoutes");
const fileRoutes = require("./routes/fileRoutes");
const timelineRoutes = require("./routes/timelineRoutes");
const extractionRoutes = require("./routes/extractionRoutes");
const exportRoutes = require("./routes/exportRoutes");
const authRoutes = require("./routes/authRoutes");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Forensic Timeline Reconstructor Backend Running");
});

app.use("/api/auth", authRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/cases", fileRoutes);
app.use("/api/cases", timelineRoutes);
app.use("/api/cases", extractionRoutes);
app.use("/api/cases", exportRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});