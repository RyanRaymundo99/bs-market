"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import { GoogleIcon } from "@/components/ui/google-icon";

interface GoogleSignupProps {
  onSuccess?: () => void;
}

const GoogleSignup = ({}: GoogleSignupProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep] = useState<"signup" | "success">("signup");
  const { toast } = useToast();

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      // Redirect to Google OAuth
      window.location.href = "/api/auth/google";
    } catch {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  if (currentStep === "success") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Account Created!</CardTitle>
          <CardDescription>
            Your account has been successfully created with Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              router.replace("/dashboard");
              router.refresh();
            }}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Sign up with Google for instant verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing up...
            </>
          ) : (
            <>
              <GoogleIcon className="w-4 h-4 mr-2" />
              Continue with Google
            </>
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          <p>✅ No phone number required</p>
          <p>✅ Instant verification</p>
          <p>✅ Secure and reliable</p>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleSignup;
