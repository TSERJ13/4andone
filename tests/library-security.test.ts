import { beforeEach, describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
const h = vi.hoisted(() => ({ calls: [] as unknown[][], parents: [{id:'mine'}], data: [] as unknown[], owner: 11 }));
vi.mock('@/lib/user-session', () => ({ resolveReadableTelegramId: async () => ({telegramId: h.owner}) }));
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: () => ({from(table: string) {
 const q: any = {then(resolve: (r: unknown)=>unknown){return Promise.resolve({data:table==='folders'?h.parents:h.data,error:null}).then(resolve)}};
 for(const method of ['select','eq','in','insert','upsert','update','delete','order','single','maybeSingle']) q[method]=(...args: unknown[])=>{h.calls.push([table,method,...args]);return q};
 return q;
}}), serviceRoleMissing: () => new Response('',{status:503}) }));
import { POST } from '../src/app/api/user/library/route';
const req = (body: unknown) => new NextRequest('http://localhost/api/user/library',{method:'POST',body:JSON.stringify(body),headers:{'content-type':'application/json'}});
beforeEach(()=>{h.calls=[];h.parents=[{id:'mine'}];h.data=[]});
describe('Library ownership',()=>{
 it('adds a server ownership predicate even with a forged owner filter',async()=>{
   await POST(req({table:'user_favorites',op:'delete',filters:[['eq','telegram_id',22]]}));
   expect(h.calls).toContainEqual(['user_favorites','eq','telegram_id',11]);
 });
 it('overwrites client ownership and excludes primary keys on insert',async()=>{
   await POST(req({table:'final_folders',op:'insert',values:{id:'victim',name:'Practice',telegram_id:22,user_id:'fake'}}));
   expect(h.calls).toContainEqual(['final_folders','insert',[{name:'Practice',telegram_id:11}]]);
 });
 it('denies inserting into someone else’s playlist',async()=>{
   const res=await POST(req({table:'folder_tracks',op:'insert',values:{folder_id:'victim',track_id:'track'}}));
   expect(res.status).toBe(403);expect(h.calls.some(c=>c[1]==='insert')).toBe(false);
 });
 it('limits child reads/deletes to owned parent IDs',async()=>{
   await POST(req({table:'folder_tracks',op:'delete',filters:[['eq','folder_id','victim']]}));
   expect(h.calls).toContainEqual(['folder_tracks','in','folder_id',['mine']]);
 });
 it('does not allow prototype keys, arbitrary tables, empty deletes or relation selects',async()=>{
   for(const body of [{table:'__proto__',op:'select'},{table:'telegram_users',op:'update'},{table:'folders',op:'delete'},{table:'folders',op:'select',select:'*,telegram_users(*)'}])
     expect((await POST(req(body))).status).toBe(400);
 });
});
