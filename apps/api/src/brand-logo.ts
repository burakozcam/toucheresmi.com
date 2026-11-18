import fs from "node:fs";
import path from "node:path";
// The original website SVG remains the platform brand source, including the PDF footer.
const svg = fs.readFileSync(path.join(__dirname,"../assets/branding/kurumsal-sinav.svg"),"utf8");
export const brandPath = svg.match(/<path[^>]*d="([^"]+)"/)![1];
const brandColor = svg.match(/<rect[^>]*fill="([^"]+)"/)![1];
export function drawBrandLogo(doc:any,x:number,y:number,size:number){doc.save().translate(x,y).scale(size/64);doc.roundedRect(0,0,64,64,18).fill(brandColor);doc.path(brandPath).fill("#ffffff");doc.restore();}
