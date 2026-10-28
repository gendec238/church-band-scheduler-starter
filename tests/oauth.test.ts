import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as connect } from "../src/app/api/auth/connect/route";
import { GET as callback } from "../src/app/api/auth/callback/route";
import { seal, unseal } from "../src/lib/security";

const authorization = `Basic ${Buffer.from(`tester:${"x".repeat(32)}`).toString("base64")}`;
function setup() {
  Object.assign(process.env, { APP_USERNAME:"tester", APP_PASSWORD:"x".repeat(32), SESSION_KEY:"ef".repeat(32), APP_ORIGIN:"https://scheduler.example", PCO_CLIENT_ID:"mock-client", PCO_CLIENT_SECRET:"mock-secret", PCO_ORGANIZATION_ID:"999", PCO_USER_AGENT:"MockTest (https://example.com)" });
}
test("OAuth connect uses state and S256 PKCE with protected short-lived cookie", async () => {
  setup();
  const response = await connect(new Request("https://scheduler.example/api/auth/connect",{headers:{authorization}}));
  assert.equal(response.status,307);
  const location = new URL(response.headers.get("location")!);
  assert.equal(location.origin,"https://api.planningcenteronline.com");
  assert.equal(location.searchParams.get("code_challenge_method"),"S256");
  assert.equal(location.searchParams.get("scope"),"services openid");
  assert.ok(location.searchParams.get("state")!.length >= 43);
  assert.match(response.headers.get("set-cookie")!,/HttpOnly/i);
  assert.match(response.headers.get("set-cookie")!,/Secure/i);
});
test("invalid OAuth state cannot trigger a token exchange", async () => {
  setup(); let calls=0; const original=globalThis.fetch;
  globalThis.fetch=(async()=>{calls++;throw new Error("Unexpected network");}) as typeof fetch;
  try {
    const response=await callback(new NextRequest("https://scheduler.example/api/auth/callback?code=mock&state=bad",{headers:{authorization,cookie:`pco_flow=${seal({state:"expected",verifier:"mock",expires:Date.now()+60000})}`}}));
    assert.equal(response.status,400); assert.equal(calls,0);
  } finally { globalThis.fetch=original; }
});
test("mocked OAuth callback accepts only the configured church and hides credentials", async () => {
  setup(); const original=globalThis.fetch;
  try {
    for (const org of ["wrong","999"]) {
      globalThis.fetch=(async (url: string | URL | Request)=> String(url).endsWith("/oauth/token") ? Response.json({access_token:"mock-token",expires_in:7200,refresh_token:"discard-me"}) : Response.json({organization_id:org})) as typeof fetch;
      const request=new NextRequest("https://scheduler.example/api/auth/callback?code=mock&state=expected",{headers:{authorization,cookie:`pco_flow=${seal({state:"expected",verifier:"mock",expires:Date.now()+60000})}`}});
      const response=await callback(request);
      assert.equal(response.status,org === "999" ? 307 : 400);
      const cookies=response.headers.get("set-cookie") || "";
      assert.ok(!cookies.includes("mock-token")); assert.ok(!cookies.includes("discard-me"));
      if (org === "999") {
        const encoded=/pco_session=([^;]+)/.exec(cookies)![1];
        const session=unseal<{token:string;organizationId:string;expires:number}>(encoded)!;
        assert.equal(session.organizationId,"999"); assert.equal(session.token,"mock-token");
        assert.ok(session.expires <= Date.now()+3600000);
      } else assert.ok(!cookies.includes("pco_session="));
    }
  } finally { globalThis.fetch=original; }
});
