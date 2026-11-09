// Disposable localhost certificate, never used by production.
const fs=require('node:fs');
if(!fs.existsSync('/tmp/optical-qa-key.pem')||!fs.existsSync('/tmp/optical-qa-cert.pem'))require('node:child_process').execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout','/tmp/optical-qa-key.pem','-out','/tmp/optical-qa-cert.pem','-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
