import assert from "node:assert/strict";

import { __test } from "../src/app/api/runtime/chat/services/endUserRuntime.ts";

const {
  normalizeEmail,
  normalizePhone,
  buildIdentityCandidates,
  mergeProfiles,
  extractProfileFromMetadata,
  extractProfileFromObject,
} = __test;

function run() {
  assert.equal(normalizeEmail(" Test@Example.COM "), "test@example.com");
  assert.equal(normalizeEmail("   "), null);
  assert.equal(normalizeEmail(null), null);
 
  assert.equal(normalizePhone("010-1234-5678"), "01012345678");
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone(null), null);

  const identities = buildIdentityCandidates({
    email: "USER@EXAMPLE.COM",
    phone: "010-1234-5678",
    member_id: "member-01",
    external_user_id: "ext-01",
  });

  assert.equal(identities[0].identity_type, "email");
  assert.equal(identities[0].identity_value, "user@example.com");
  assert.equal(identities[0].is_primary, true);

  const phone = identities.find((item) => item.identity_type === "phone");
  const member = identities.find((item) => item.identity_type === "member_id");
  const external = identities.find((item) => item.identity_type === "external");

  assert.equal(phone?.identity_value, "01012345678");
  assert.equal(phone?.is_primary, false);
  assert.equal(member?.identity_value, "member-01");
  assert.equal(member?.is_primary, false);
  assert.equal(external?.identity_value, "ext-01");
  assert.equal(external?.is_primary, false);
 
  const fallbackIdentities = buildIdentityCandidates({
    phone: "010-9999-0000",
  });
  assert.equal(fallbackIdentities[0].identity_type, "phone");
  assert.equal(fallbackIdentities[0].is_primary, true);

  const merged = mergeProfiles(
    {
      display_name: "Base",
      email: "base@example.com",
      tags: ["vip"],
      attributes: { tier: "gold", size: "m" },
    },
    {
      display_name: "  ",
      email: "override@example.com",
      tags: ["vip", "new"],
      attributes: { size: "l", color: "black" },
    }
  );

  assert.equal(merged.display_name, "Base");
  assert.equal(merged.email, "override@example.com");
  assert.deepEqual(merged.tags, ["vip", "new"]);
  assert.deepEqual(merged.attributes, { tier: "gold", size: "l", color: "black" });
 
  const profileFromMetadata = extractProfileFromMetadata({
    visitor_id: "cookie-123",
    end_user: {
      name: "홍길동",
      email: "GILDONG@EXAMPLE.COM",
    },
  });

  assert.equal(profileFromMetadata.display_name, "홍길동");
  assert.equal(profileFromMetadata.email, "GILDONG@EXAMPLE.COM");
  assert.equal(profileFromMetadata.external_user_id, "cookie-123");

  const profileFromObject = extractProfileFromObject({
    full_name: "김테스트",
    phone_number: "010-2222-3333",
    membership_id: "mem-99",
    externalUserId: "ext-77",
    language: "ko",
  });

  assert.equal(profileFromObject.display_name, "김테스트");
  assert.equal(profileFromObject.phone, "010-2222-3333");
  assert.equal(profileFromObject.member_id, "mem-99");
  assert.equal(profileFromObject.external_user_id, "ext-77");
  assert.equal(profileFromObject.locale, "ko");
}

run();
