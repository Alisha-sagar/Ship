import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
}

export function EmailVerification({ email, onVerified }: EmailVerificationProps) {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendOTP = useAction(api.email.sendVerificationOTP);
  const verifyOTP = useMutation(api.email.verifyOTP);
  const isVerified = useQuery(api.email.isEmailVerified, { email });

  const handleSendOTP = async () => {
    setIsLoading(true);
    try {
      await sendOTP({ email });
      toast.success("Verification code sent to your email!");
    } catch (error) {
      toast.error("Failed to send verification code");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP({ email, otp: otp.trim() });
      toast.success("Email verified successfully!");
      onVerified();
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
        <div className="text-4xl mb-2">✅</div>
        <h3 className="text-lg font-semibold text-green-800 mb-1">Email Verified!</h3>
        <p className="text-green-600">Your email has been successfully verified.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">📧</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Email</h2>
        <p className="text-gray-600">
          We've sent a verification code to <strong>{email}</strong>
        </p>
      </div>

      <form onSubmit={handleVerifyOTP} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Verification Code
          </label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 6-digit code"
            className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary tracking-widest"
            maxLength={6}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || otp.length !== 6}
          className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Verifying..." : "Verify Email"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={handleSendOTP}
          disabled={isLoading}
          className="text-primary hover:text-primary-hover text-sm font-medium disabled:opacity-50"
        >
          Didn't receive the code? Resend
        </button>
      </div>
    </div>
  );
}
