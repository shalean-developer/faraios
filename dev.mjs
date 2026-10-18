import {createDashboardServer} from './src/dashboard.js';
if(process.env.NODE_ENV==='production')throw new Error('Demo cannot run in production');
const server=createDashboardServer({demo:true});
server.listen(3100,'127.0.0.1',()=>console.log('FaraiOS local demo: http://127.0.0.1:3100/login'));
