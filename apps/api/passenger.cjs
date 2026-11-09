'use strict';
// Passenger entry point: requiring server.js does not open a second listener.
if(typeof PhusionPassenger!=='undefined')PhusionPassenger.configure({autoInstall:false});
const {app}=require('./dist/src/server.js');
const target=typeof PhusionPassenger!=='undefined'?'passenger':Number(process.env.PORT||process.env.API_PORT||4000);
const server=app.listen(target,()=>console.info('Kurumsal Sınav API hazır.'));
module.exports={app,server};
