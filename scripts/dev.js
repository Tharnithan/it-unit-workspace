const {spawn}=require('node:child_process');const path=require('node:path');
const children=[spawn(process.execPath,['--watch','src/server.js'],{cwd:path.resolve('backend'),stdio:'inherit'}),spawn(process.execPath,[path.resolve('node_modules/vite/bin/vite.js')],{cwd:path.resolve('frontend'),stdio:'inherit'})];
for(const c of children)c.on('error',e=>{console.error(e.message);process.exitCode=1});
process.on('SIGINT',()=>{children.forEach(c=>c.kill());process.exit()});
process.on('SIGTERM',()=>{children.forEach(c=>c.kill());process.exit()});
