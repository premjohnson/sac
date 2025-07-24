import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Temp storage directory
const tempDir = path.join(process.cwd(), 'temp_uploads');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /\.(jpeg|jpg|png|webp)$/i;
  if (allowed.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 12 * 1024 * 1024 } // 12MB per file
});
