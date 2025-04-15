const { MongoClient, ObjectId, GridFSBucket } = require("mongodb");

require("dotenv").config();
const mongoUri = process.env.MONGO_URI;

const dbName = mongoUri.split("/").pop(); // "empowerhr"

const getFileById = async (req, res) => {
  const fileId = req.params.id;

  try {
    const client = await MongoClient.connect(mongoUri);
    const db = client.db(dbName);

    const bucket = new GridFSBucket(db);

    // Lấy metadata file
    const file = await db
      .collection("fs.files")
      .findOne({ _id: new ObjectId(fileId) });

    if (!file) {
      await client.close();
      return res.status(404).json({ message: "File not found" });
    }

    // Header phản hồi
    res.set({
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${file.filename}"`,
    });

    // Stream file ra response
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

    downloadStream.on("error", async (err) => {
      console.error("❌ Stream error:", err);
      res
        .status(500)
        .json({ message: "Error streaming file", error: err.message });
      await client.close();
    });

    downloadStream.on("end", async () => {
      await client.close();
    });

    downloadStream.pipe(res); // <-- hiệu quả và đáng tin cậy hơn
  } catch (err) {
    console.error("❌ Lỗi tải file:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getFileById };
