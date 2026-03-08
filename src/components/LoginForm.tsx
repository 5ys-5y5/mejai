import { Input } from "@/components/ui/Input";

type LoginFormProps = {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  emailRightSlot?: React.ReactNode;
  passwordRightSlot?: React.ReactNode;
  showHelperText?: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export function LoginForm({
  email,
  password,
  loading,
  error,
  emailRightSlot,
  passwordRightSlot,
  showHelperText = true,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <div className="space-y-4">
      <label className="block">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600">이메일</div>
          {emailRightSlot ? <div className="text-xs text-slate-600">{emailRightSlot}</div> : null}
        </div>
        <Input
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="이메일 주소"
          className="mt-2"
        />
      </label>

      <label className="block">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600">비밀번호</div>
          {passwordRightSlot ? <div className="text-xs text-slate-600">{passwordRightSlot}</div> : null}
        </div>
        <Input
          value={password}
          type="password"
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="••••••••"
          className="mt-2"
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        className="w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        onClick={onSubmit}
        disabled={loading}
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>

      {showHelperText ? (
        <div className="text-center text-xs text-slate-500">
          이메일 인증이 완료된 계정만 로그인할 수 있습니다.
        </div>
      ) : null}
    </div>
  );
}
