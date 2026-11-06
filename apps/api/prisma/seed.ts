import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const startingPublishers = [
  "345 YAYIN", "365 GÜN", "3D ORTAOKUL", "3X", "A PLUS", "AÇI", "ADAY", "ADRENALİN", "ALAN", "ALL STAR",
  "ALTIN KARMA", "ANKARA", "ANKARA İL M.E.M.", "ANTİ ARTI MATEMATİK", "ARENA", "ARI", "ARTI ZEKA", "ARTIBİR",
  "ATA", "ATOM", "AV", "AYDIN", "BALKÜPÜ", "BENİM FAVORİM", "BENİM HOCAM", "BERKAY", "BES", "BEYİN TAKIMI",
  "BİLAL IŞIKLI", "BİLECİK İL M.E.M.", "BİLFEN", "BİLİM ETİK", "BİNOT", "BİZDEN", "BYS", "ÇALIŞKAN ARI",
  "ÇANTA", "CANVİVA", "ÇÖZÜM", "DAMLA", "DENE365", "EDEBİYAT SOKAĞI", "EDU", "EFSANE", "EKSEN",
  "EKSEN İLKOKUL", "EKSEN ORTAOKUL", "EKSPERT", "ELİT KARMA", "ENDENEME", "EPHESUS AKADEMİ", "EPİK", "ESEN",
  "ETA", "ETAP", "ETKİLİ MATEMATİK", "FATİH AY", "FENOMEN", "FEYBE", "Fİ", "FİNAL", "FİT", "FORVET",
  "FULL", "FUZEM", "GEBZE İLÇE M.E.M.", "GERİ SAYIM", "GİZLİ", "GO", "GÜNAY", "GÜR", "HİPER ZEKA",
  "HIZ", "İKSİR", "İLK ÖNCE", "İLKOKUL1", "İLKOKULLUYUM", "İNTRO", "IQ", "İSEM", "İŞLEYEN ZEKA",
  "KAFA DENGİ", "KANGURU", "KARACA", "KAREKÖK", "KATYON", "KIRMIZI BEYAZ", "KLASMAN", "KONYA İL M.E.M.",
  "KOŞUL", "KRAKADEMİ", "KRALLAR KARMASI", "KURUL", "KY", "LEGEND", "LİDERLER KARMASI", "LİMİT",
  "MADALYON", "MAGIC", "MARATON", "MARKA", "MC2", "MEBİ", "MERAKLI ZİHİNLER", "META DERS", "METAFOR",
  "METİN", "MİRAY", "MOBESE", "MODEL EĞİTİM", "MOTİVASYON", "MOZAİK", "MUBA", "N. A. FEN BİLİMLERİ",
  "NARTESİ", "NAVİGASYON", "NEGO", "NETBİL", "NETİZ", "NEWTON", "NİGE", "NİTELİK", "OBİR",
  "ÖĞRETMEN EVDE", "OKSİJEN", "OKULPEDİA", "OKYANUS", "ÖLÇEK", "OMAGE", "ÖNCELİK", "ÖZDEBİR",
  "ÖZDER", "ÖZEL", "ÖZGÜN AKADEMİ", "ÖZKURBİR", "PALME", "PARAF", "PAYLAŞIM", "PERİSKOP", "PLATON",
  "PLE", "PRUVA AKADEMİ", "PUAN", "REEL", "RETRO", "RİTMİK", "SADIK UYGUN", "SAYDAM", "ŞEKER PORTAKALI",
  "SES", "SEVİYE", "SİNAN KUZUCU", "SINAV", "SINAV 1258", "SİSTEMATİK", "SİVAS İL M.E.M.", "SON VİRAJ",
  "SONUÇ", "SPOİLER", "STARTFEN", "STEP", "STRATEJİ", "TAMMAT", "TANDEM", "TANIM", "TEOREM", "TEORİ PRATİK",
  "TESLA", "TG (TEST GRUP)", "TÖDER", "TÖZOK", "TREND KARMA", "TUDEM", "TÜRKİYE DENEME PLATFORMU", "TÜYO HOCA",
  "ÜÇİZ 42", "ULTİ", "ÜNLÜLER KARMASI", "VAN İL M.E.M.", "VİP", "WORKWIN", "X YAYIN", "YAMANTÜRK",
  "YANIT", "YARGI", "YENİ TARZ", "YOK YOK", "ZEKA KÜPÜ",
] as const;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("ADMIN_EMAIL ve en az 12 karakterli, en fazla 72 baytlık ADMIN_PASSWORD ayarlanmalıdır.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      firstName: "Sistem",
      lastName: "Yöneticisi",
      role: Role.SUPER_ADMIN,
    },
  });

  for (const publisherName of startingPublishers) {
    const normalizedName = normalize(publisherName);
    await prisma.publisher.upsert({
      where: { normalizedName },
      update: { name: publisherName },
      create: {
        name: publisherName,
        normalizedName,
        active: true,
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
