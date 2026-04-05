'use strict';
const cooldowns=new Map();
function check(userId,command,seconds){
  const key=`${userId}:${command}`;
  const now=Date.now();
  const expires=cooldowns.get(key)||0;
  if(now<expires)return Math.ceil((expires-now)/1000);
  cooldowns.set(key,now+seconds*1000);
  return 0;
}
// Limpa entradas antigas a cada 5 minutos
setInterval(()=>{const now=Date.now();for(const[k,v]of cooldowns)if(v<now)cooldowns.delete(k)},5*60*1000);
module.exports={check};
