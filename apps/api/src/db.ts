import { PrismaClient } from "@prisma/client";
import {env} from "./config";
const globalDatabase=globalThis as unknown as {optikPrisma?:PrismaClient};
export const prisma=globalDatabase.optikPrisma??new PrismaClient({datasourceUrl:env.DATABASE_URL});
if(process.env.NODE_ENV!=="production")globalDatabase.optikPrisma=prisma;
