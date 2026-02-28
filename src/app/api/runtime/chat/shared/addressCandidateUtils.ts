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
    label: String(candidate.index),
    value: String(candidate.index),
  }));
}

export function buildAddressCandidateChoiceItems(candidates: AddressCandidate[]) {
  return candidates.map((candidate) => ({
    value: String(candidate.index),
    label: `${candidate.index}??,
    title: candidate.jibun_addr || candidate.road_addr || `?꾨낫 ${candidate.index}`,
    description: [candidate.road_addr, candidate.zip_no].filter(Boolean).join(" / "),
    fields: [
      { label: "지번주??, value: candidate.jibun_addr || "-" },
      { label: "Unknown"-" },
      { label: "?고렪踰덊샇", value: candidate.zip_no || "-" },
    ],
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
  const withKoreanSuffix = normalized.match(/(\d{1,2})\s*??);
  if (withKoreanSuffix) {
    const picked = Number(withKoreanSuffix[1]);
    return picked >= 1 && picked <= max ? picked : null;
  }
  return null;
}

export function buildAddressCandidateChoicePrompt(input: { candidates: AddressCandidate[]; originalAddress: string }) {
  const { candidates, originalAddress } = input;
  const lines = [
    "?낅젰?섏떊 二쇱냼? 留ㅼ묶???꾨낫媛 ?щ윭 媛쒖엯?덈떎. ?뺥솗??二쇱냼瑜??좏깮??二쇱꽭??",
    `?낅젰 二쇱냼: ${originalAddress || "-"}`,
    "",
  ];
  for (const candidate of candidates) {
    lines.push(
      `${candidate.index}??,
      `- 지번주?? ${candidate.jibun_addr || "-"}`,
      `- ?????????? ${candidate.road_addr || "-"}`,
      `- ?고렪踰덊샇: ${candidate.zip_no || "-"}`,
      ""
    );
  }
  lines.push("?먰븯??踰덊샇瑜??낅젰??二쇱꽭?? (?? 1)");
  return lines.join("\n");
}
