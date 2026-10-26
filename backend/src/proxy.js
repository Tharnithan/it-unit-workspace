// Trust only the configured number of proxy hops, never arbitrary forwarded chains.
export function proxyHops(env=process.env){
 const value=env.TRUST_PROXY_HOPS?.trim();
 if(!value)return env.RENDER==='true'?1:0;
 if(!/^[0-5]$/.test(value))throw new Error('TRUST_PROXY_HOPS must be a whole number from 0 to 5');
 return Number(value);
}
