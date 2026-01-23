import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Cpu,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import doggieSrc from "../assets/doggie.svg";
import { ClassificationBanner } from "../components/ClassificationBanner"; // <--- Import

export const LoginPage = () => {
  const [status, setStatus] = useState<
    "idle" | "reading" | "success" | "error"
  >("idle");

  const handleCacLogin = () => {
    // 1. UI Feedback: Simulate browser looking for card/certificate
    setStatus("reading");

    // 2. Logic: In production, this triggers client-side cert selection (mTLS)
    // or a WebAuthn/SmartCard API call.
    setTimeout(() => {
      // Mocking a successful certificate selection
      setStatus("success");

      // Redirect would happen here
      console.log("Certificate selected. Authenticating...");
    }, 2500);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-transparent relative">
      {/* Top Banner */}
      <ClassificationBanner />
      <div className="flex-1 min-h-0 relative overflow-y-auto flex flex-col">
        <div className="min-h-screen flex items-center justify-center bg-transparent p-6 relative overflow-hidden">
          {/* Local background effects removed to use Global App Background */}

          <div className="w-full max-w-md space-y-8 relative z-10 animate-in zoom-in-95 duration-500">
            {/* Header Section */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-background/50 to-muted/50 border shadow-sm relative group backdrop-blur-sm">
                {/* Logo */}
                <img
                  src={doggieSrc}
                  alt="AIRBud"
                  className="h-12 w-12 relative z-10"
                />

                {/* Animated Scan Effect behind logo */}
                <div className="absolute inset-0 border-2 border-primary/20 rounded-2xl" />
                <div className="absolute inset-0 bg-primary/5 rounded-2xl animate-pulse" />
              </div>

              <div>
                <h1 className="text-3xl font-extrabold tracking-tight flex justify-center items-center gap-2">
                  AIRBud <span className="text-primary">Secure</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
                  Automated Information Retriever Buddy
                  <br />
                  Restricted Access System
                </p>
              </div>
            </div>

            {/* Main Card */}
            <Card className="border-2 border-muted/40 shadow-2xl bg-card/80 backdrop-blur-xl relative overflow-hidden">
              {/* Top Status Bar */}
              <div className="h-1.5 w-full bg-muted/50">
                {status === "reading" && (
                  <div
                    className="h-full bg-primary animate-[loading_1s_ease-in-out_infinite]"
                    style={{ width: "100%" }}
                  />
                )}
                {status === "success" && (
                  <div className="h-full bg-green-500 w-full transition-all duration-500" />
                )}
              </div>

              <CardHeader className="space-y-1 pb-4 text-center">
                <Badge
                  variant="outline"
                  className="w-fit mx-auto mb-2 border-primary/30 text-primary bg-primary/5 px-3 py-1"
                >
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  DoD PKI / CAC Required
                </Badge>
              </CardHeader>

              <CardContent className="space-y-8 pb-8">
                {/* Visual Chip Representation */}
                <div className="relative h-32 w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl border flex flex-col justify-between p-6 shadow-inner group transition-all duration-500">
                  {status === "reading" && (
                    <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-xl z-0" />
                  )}

                  <div className="flex justify-between items-start relative z-10">
                    <div className="h-10 w-12 rounded bg-yellow-400/20 border border-yellow-500/40 flex items-center justify-center">
                      <Cpu className="h-6 w-6 text-yellow-600 dark:text-yellow-400 opacity-80" />
                    </div>
                    <ScanLine
                      className={`h-6 w-6 text-muted-foreground ${status === "reading" ? "animate-spin" : ""}`}
                    />
                  </div>

                  <div className="relative z-10">
                    <div className="h-2 w-24 bg-foreground/10 rounded mb-2" />
                    <div className="h-2 w-16 bg-foreground/10 rounded" />
                  </div>

                  {/* Success Overlay */}
                  {status === "success" && (
                    <div className="absolute inset-0 bg-background/80/90 flex items-center justify-center rounded-xl z-20 animate-in fade-in duration-300">
                      <div className="text-center">
                        <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold">
                          Certificate Verified
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={handleCacLogin}
                    size="lg"
                    disabled={status === "reading" || status === "success"}
                    className="w-full h-12 text-base font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {status === "idle" && "Authenticate with CAC"}
                    {status === "reading" && "Reading Smart Card..."}
                    {status === "success" && "Redirecting..."}
                  </Button>

                  <div className="text-xs text-center text-muted-foreground leading-relaxed px-4">
                    Insert your Common Access Card (CAC) into the reader and
                    click the button above. Select your{" "}
                    <strong>Authentication Certificate</strong> when prompted by
                    the browser.
                  </div>
                </div>
              </CardContent>

              <Separator />

              <CardFooter className="bg-muted/10 py-4 flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <Lock className="h-3 w-3" /> 256-bit SSL Encrypted
                </div>
                <div className="text-[10px] text-muted-foreground/60 text-center max-w-xs mx-auto">
                  Unauthorized access to this information system is prohibited
                  and subject to criminal and civil penalties.
                </div>
              </CardFooter>
            </Card>

            {/* Support Links */}
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <Link
                to="/help"
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                <AlertTriangle className="h-3 w-3" /> Trouble connecting?
              </Link>
            </div>
          </div>
        </div>
        <ClassificationBanner />
      </div>
    </div>
  );
};
