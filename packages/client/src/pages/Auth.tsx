import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Input, Button, ErrorMessage, Field } from "@/components/ui";
import { Tabs } from "@/components/Tabs";
import { useAuth } from "@/context/AuthContext";
import { saveTokens } from "@/lib/auth";
import { login, signup } from "@/lib/api";

type Tab = "login" | "signup";
type Role = "attendee" | "organizer";

// ── types ──────────────────────────────────────────────────────────────────
interface LoginForm {
  email: string;
  password: string;
}

interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type LoginErrors = Partial<LoginForm>;
type SignupErrors = Partial<SignupForm>;

// ── login form ─────────────────────────────────────────────────────────────
interface LoginFormProps {
  onSuccess: () => void;
}

function LoginForm({ onSuccess }: LoginFormProps) {
  const { setUser } = useAuth();
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => login(form),
    onSuccess: ({ data }) => {
      saveTokens({
        ...data,
      });

      const payload = JSON.parse(atob(data.idToken.split(".")[1]));
      setUser({
        idToken: data.idToken,
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload["custom:role"],
      });
      onSuccess();
    },
  });

  function set(field: keyof LoginForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: LoginErrors = {};
    if (!form.email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Invalid email";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="flex flex-col gap-5">
      <Field label="Email" error={errors.email}>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@email.com"
          error={errors.email}
        />
      </Field>

      <Field label="Password" error={errors.password}>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="••••••••"
          error={errors.password}
        />
      </Field>

      <ErrorMessage error={error} />

      <Button
        variant="red"
        className="w-full"
        onClick={() => validate() && mutate()}
        disabled={isPending}
      >
        {isPending ? "Logging in..." : "Login →"}
      </Button>
    </div>
  );
}

// ── signup form ────────────────────────────────────────────────────────────
interface SignupFormProps {
  onSuccess: () => void;
}

function SignupForm({ onSuccess }: SignupFormProps) {
  const [role, setRole] = useState<Role>("attendee");
  const [form, setForm] = useState<SignupForm>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<SignupErrors>({});

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => signup({ ...form, role }),
    onSuccess,
  });

  function set(field: keyof SignupForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: SignupErrors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Invalid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (!form.confirmPassword)
      e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* role selector */}
      <div className="flex gap-3">
        {(["attendee", "organizer"] as Role[]).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`flex-1 cursor-pointer py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all ${
              role === r
                ? "bg-orange-500 text-white border-orange-500"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            {r === "attendee" ? "Attendee" : "Organizer"}
          </button>
        ))}
      </div>

      <Field label="Name" error={errors.name}>
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Jamie Reid"
          error={errors.name}
        />
      </Field>

      <Field label="Email" error={errors.email}>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@email.com"
          error={errors.email}
        />
      </Field>

      <Field label="Password" error={errors.password}>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="••••••••"
          error={errors.password}
        />
      </Field>

      <Field label="Confirm password" error={errors.confirmPassword}>
        <Input
          type="password"
          value={form.confirmPassword}
          onChange={(e) => set("confirmPassword", e.target.value)}
          placeholder="••••••••"
          error={errors.confirmPassword}
        />
      </Field>

      <ErrorMessage error={error} />

      <Button
        variant="red"
        className="w-full "
        onClick={() => validate() && mutate()}
        disabled={isPending}
      >
        {isPending ? "Creating account..." : "Create account →"}
      </Button>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────
export default function Auth() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("login");

  const tabs = [
    {
      value: "login" as Tab,
      label: "Login",
      content: <LoginForm onSuccess={() => navigate("/")} />,
    },
    {
      value: "signup" as Tab,
      label: "Sign up",
      content: <SignupForm onSuccess={() => setTab("login")} />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md overflow-hidden">
        {/* header */}
        <div className="px-8 pt-8 pb-4">
          <h1 className="font-['Righteous'] text-3xl text-gray-900">
            ani<span className="text-orange-500">fest</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {tab === "login" ? "Welcome back." : "Create your account."}
          </p>
        </div>

        {/* tabs */}
        <Tabs tabs={tabs} active={tab} onTabChange={(tab) => setTab(tab)} />

        {/* switch tab hint */}
        <p className="text-center text-xs text-gray-400 pb-6 pt-2">
          {tab === "login" ? (
            <>
              No account?{" "}
              <button
                onClick={() => setTab("signup")}
                className="text-orange-500 font-semibold"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setTab("login")}
                className="text-orange-500 font-semibold"
              >
                Login
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
