import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') }); // Correct
dotenv.config({ path: path.resolve(process.cwd(), '.env') }); // Fallback for src/config

cloudinary.config({
  cloud_name: process.env.CLOUDNAME,
  api_key: process.env.APIKEY,
  api_secret: process.env.APISECRET,
});

export default cloudinary;
