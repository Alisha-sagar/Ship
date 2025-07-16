"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData).catch((error) => {
            let toastTitle = "";
            if (error.message.includes("Invalid password")) {
              toastTitle = "Invalid password. Please try again.";
            } else {
              toastTitle =
                flow === "signIn"
                  ? "Could not sign in, did you mean to sign up?"
                  : "Could not sign up, did you mean to sign in?";
            }
            toast.error(toastTitle);
            setSubmitting(false);
          });
        }}
      >
        <h2 className="text-2xl font-bold text-center mb-4">
          {flow === "signIn" ? "Welcome back 💕" : "Create your account 💘"}
        </h2>

        <input
          className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all"
          type="email"
          name="email"
          placeholder="Your email"
          required
        />
        <input
          className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all"
          type="password"
          name="password"
          placeholder="Your password"
          required
        />
        <button
          className="w-full py-3 rounded-xl bg-pink-500 text-white font-semibold hover:bg-pink-600 transition-colors disabled:opacity-50"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? flow === "signIn"
              ? "Signing in..."
              : "Signing up..."
            : flow === "signIn"
            ? "💖 Sign in"
            : "💌 Sign up"}
        </button>

        <div className="text-center text-sm text-gray-500 mt-2">
          {flow === "signIn"
            ? "Don't have an account?"
            : "Already have an account?"}{" "}
          <button
            type="button"
            className="text-pink-500 hover:underline font-medium"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-center my-6">
        <hr className="grow border-gray-200" />
        <span className="mx-4 text-gray-400">or</span>
        <hr className="grow border-gray-200" />
      </div>

      <button
        className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        onClick={() => void signIn("anonymous")}
      >
        🕶️ Sign in anonymously
      </button>
    </div>
  );
}
