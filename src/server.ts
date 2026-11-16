import 'dotenv/config';
import {app} from './app.js';
import {pool} from './db.js';
const port=Number(process.env.PORT??3000);
const server=app.listen(port,()=>console.log(`Hotmart MCP listening on ${port}`));
process.on('SIGTERM',()=>{server.close();void pool.end();});
