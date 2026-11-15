// Workspace commands run with apps/web as cwd. Load its Next env files first,
// then the shared root .env without overriding shell/cPanel configuration.
const path=require('node:path');
const {spawn}=require('node:child_process');
const command=process.argv[2]||'dev';
require('@next/env').loadEnvConfig(path.resolve(__dirname,'..'),command==='dev');
require('dotenv').config({path:path.resolve(__dirname,'../../../.env'),override:false,quiet:true});
if(command!=="dev"&&!process.env.NEXT_PUBLIC_API_URL){console.error("NEXT_PUBLIC_API_URL eksik. Kök .env.example dosyasını .env olarak kopyalayın; cPanel ortamında Web değişkenini build öncesinde ayarlayın.");process.exit(1);}
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),...process.argv.slice(2)],{stdio:'inherit',env:process.env});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
