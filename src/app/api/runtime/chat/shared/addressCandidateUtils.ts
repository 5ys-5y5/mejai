export type AddressCandidate = {
  index: number;
  zip_no: string;
  road_addr: string;
  jibun_addr: string;
  display_label: string;
};

function toText(value: unknown) {
  return String(value || "").trim();
}

export function extractAddressCandidatesFromSearchData(searchData: unknown, max = 5): AddressCandidate[] {
  const data = (searchData as Record<string, any>) || {};
  const rows = Array.isArray(data.results)
    ? (data.results as Array<Record<string, any>>)
    : [];
  const out: AddressCandidate[] = [];
  for (const row of rows) {
    const zipNo = toText(row.zipNo);
    const roadAddr = toText(row.roadAddr || row.roadAddrPart1);
    const jibunAddr = toText(row.jibunAddr);
    if (!zipNo) continue;
    const label = `${jibunAddr || roadAddr || "-"} / ${roadAddr || "-"} / ${zipNo}`;
    const duplicate = out.some(
      (item) => item.zip_no === zipNo && item.road_addr === roadAddr && item.jibun_addr === jibunAddr
    );
    if (duplicate) continue;
    out.push({
      index: out.length + 1,
      zip_no: zipNo,
      road_addr: roadAddr,
      jibun_addr: jibunAddr,
      display_label: label,
    });
    if (out.length >= Math.max(1, Math.floor(max))) break;
  }
  return out;
}

export function buildAddressCandidateQuickReplies(candidates: AddressCandidate[]) {
  return candidates.map((candidate) => ({
    label: `${candidate.index}번`,
    value: String(candidate.index),
  }));
}

export function parseAddressCandidateSelection(rawText: string, candidateCount: number) {
  const max = Math.max(1, Math.floor(candidateCount));
  const normalized = String(rawText || "").trim();
  if (!normalized) return null;
  const pureNumber = normalized.match(/^\d{1,2}$/);
  if (pureNumber) {
    const picked = Number(pureNumber[0]);
    return picked >= 1 && picked <= max ? picked : null;
  }
  const withKoreanSuffix = normalized.match(/(\d{1,2})\s*번/);
  if (withKoreanSuffix) {
    const picked = Number(withKoreanSuffix[1]);
    return picked >= 1 && picked <= max ? picked : null;
  }
  return null;
}

export function buildAddressCandidateChoicePrompt(input: { candidates: AddressCandidate[]; originalAddress: string }) {
  const { candidates, originalAddress } = input;
  const lines = [
    "입력하신 주소와 매칭된 후보가 여러 개입니다. 정확한 주소를 선택해 주세요.",
    `입력 주소: ${originalAddress || "-"}`,
    "",
  ];
  for (const candidate of candidates) {
    lines.push(
      `${candidate.index}번`,
      `- 지번주소: ${candidate.jibun_addr || "-"}`,
      `- 도로명주소: ${candidate.road_addr || "-"}`,
      `- 우편번호: ${candidate.zip_no || "-"}`,
      ""
    );
  }
  lines.push("원하는 번호를 입력해 주세요. (예: 1)");
  return lines.join("\n");
}

