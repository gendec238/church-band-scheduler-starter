import test from "node:test";
import assert from "node:assert/strict";
import { authorized, id, seal, unseal } from "../src/lib/security";
import { readCollection } from "../src/lib/pco";
import { duplicatePeople, makeDraft } from "../src/lib/draft";
import { POST } from "../src/app/api/planning-center/publish/route";

test("app gate fails closed, checks exact credentials and rejects short passwords", () => {
  const env = { APP_USERNAME:"admin", APP_PASSWORD:"a".repeat(32) };
  const header = `Basic ${Buffer.from(`admin:${env.APP_PASSWORD}`).toString("base64")}`;
  assert.equal(authorized(header,env),true);
  assert.equal(authorized(null,env),false);
  assert.equal(authorized(header,{}),false);
  assert.equal(authorized(header,{...env,APP_PASSWORD:"short"}),false);
  assert.equal(authorized(header,{...env,APP_USERNAME:"other"}),false);
});
test("encrypted sessions reject tampering, expiry and key rotation", () => {
  process.env.SESSION_KEY = "ab".repeat(32);
  const value = seal({ token:"mock-only", expires:Date.now()+60000 });
  assert.equal(unseal<{token:string;expires:number}>(value)?.token,"mock-only");
  assert.equal(unseal(value.slice(0,-8)+"AAAAAAAA"),null);
  assert.equal(unseal(seal({expires:Date.now()-1})),null);
  process.env.SESSION_KEY = "cd".repeat(32);
  assert.equal(unseal(value),null);
});
test("API IDs reject path/query injection", () => {
  assert.equal(id("123"),"123");
  for (const value of [null,"../123","1?x=2","1/2",""]) assert.throws(()=>id(value));
});
test("draft supports per-plan substitutes, empty slots and duplicate warnings", () => {
  const draft = makeDraft(["1","2"],["10","11"],{"10":"100","11":"100"},{"2:10":"200","2:11":"__empty__"});
  assert.equal(draft.length,3);
  assert.equal(draft[2].personId,"200");
  assert.equal(draft[2].source,"substitute");
  assert.equal(duplicatePeople(draft).length,1);
});
test("read adapter follows pagination with GET only and deduplicates includes", async () => {
  const methods: string[]=[];
  const mock = (async (_url: unknown, init?: RequestInit) => {
    methods.push(init?.method || "");
    return Response.json({data:[{id:String(methods.length)}],included:[{id:"x",type:"Person"}],links:{next:methods.length === 1 ? "https://api.planningcenteronline.com/services/v2/service_types?page=2" : null}});
  }) as typeof fetch;
  const data = await readCollection("/services/v2/service_types","mock",mock);
  assert.equal(data.data.length,2); assert.equal(data.included?.length,1); assert.deepEqual(methods,["GET","GET"]);
});
test("read adapter refuses malicious pagination before sending token", async () => {
  let calls=0;
  const mock=(async ()=>{calls++;return Response.json({data:[],links:{next:"https://example.com/steal"}});}) as typeof fetch;
  await assert.rejects(readCollection("/services/v2/service_types","mock",mock)); assert.equal(calls,1);
});
test("upstream failure returns no partial collection", async () => {
  const mock=(async ()=>new Response("private upstream details",{status:403})) as typeof fetch;
  await assert.rejects(readCollection("/services/v2/service_types","mock",mock), /read failed \(403\)/);
});
test("publish denies both anonymous and authenticated requests without network", async () => {
  process.env.APP_USERNAME="test"; process.env.APP_PASSWORD="a".repeat(32);
  const original=globalThis.fetch; let calls=0;
  globalThis.fetch=(async ()=>{calls++;throw new Error("Network forbidden in test");}) as typeof fetch;
  try {
    assert.equal((await POST(new Request("http://localhost/api/planning-center/publish",{method:"POST"}))).status,401);
    assert.equal((await POST(new Request("http://localhost/api/planning-center/publish",{method:"POST",headers:{authorization:`Basic ${Buffer.from(`test:${process.env.APP_PASSWORD}`).toString("base64")}`}}))).status,403);
    assert.equal(calls,0);
  } finally { globalThis.fetch=original; }
});
