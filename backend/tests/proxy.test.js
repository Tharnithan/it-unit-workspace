import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import rateLimit from 'express-rate-limit';
import {proxyHops} from '../src/proxy.js';

test('proxy configuration defaults and invalid overrides',()=>{
 assert.equal(proxyHops({}),0);
 assert.equal(proxyHops({RENDER:'true'}),1);
 assert.equal(proxyHops({RENDER:'true',TRUST_PROXY_HOPS:'0'}),0);
 assert.equal(proxyHops({TRUST_PROXY_HOPS:'2'}),2);
 for(const value of ['true','-1','1.5','6','abc'])assert.throws(()=>proxyHops({TRUST_PROXY_HOPS:value}));
});
test('one-hop proxy keeps client buckets separate and ignores spoofed leftmost addresses',async t=>{
 const app=express();app.set('trust proxy',proxyHops({RENDER:'true'}));
 app.use(rateLimit({windowMs:60000,limit:2}));app.get('/',(req,res)=>res.json({ip:req.ip}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 const request=forwarded=>fetch('http://127.0.0.1:'+server.address().port,{headers:{'X-Forwarded-For':forwarded}});
 const first=await request('198.51.100.99, 203.0.113.10');assert.equal(first.status,200);assert.equal((await first.json()).ip,'203.0.113.10');
 assert.equal((await request('198.51.100.98, 203.0.113.10')).status,200);
 assert.equal((await request('198.51.100.97, 203.0.113.10')).status,429);
 assert.equal((await request('203.0.113.11')).status,200);
});
