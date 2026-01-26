import { formatBytes } from "@/lib/ragStorage";

type RagStorageBadgeProps = {
  usedBytes: number;
  limitBytes: number;
};

export default function RagStorageBadge({ usedBytes, limitBytes }: RagStorageBadgeProps) {
  return (
    <div
      className="max-w-full w-max flex items-center text-sm font-medium gap-1 border border-gray-alpha-200 p-1.5 pr-3.5 rounded-full cursor-pointer hover:border-gray-alpha-300 transition-colors"
      data-state="closed"
    >
      <div className="rounded-full h-2 w-2 m-2 bg-green-500"></div>
      <span>RAG Storage: </span>
      <span className="font-semibold font-waldenburg-ht">{formatBytes(usedBytes)}</span>
      <span className="text-gray-alpha-600">/ {formatBytes(limitBytes)}</span>
    </div>
  );
}
