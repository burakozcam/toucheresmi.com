require('./v142-env.cjs');
require('../../apps/api/src/server.ts').app.listen(4022,'127.0.0.1',()=>console.log('v142 synthetic API :4022'));
